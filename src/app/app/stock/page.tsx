"use client"
/**
 * หน้าสต๊อกของพนักงาน (/app/stock)
 *   พนักงานเห็นสต๊อกสาขาตัวเอง หรือเฉพาะที่ตัวเองนำเข้า
 *   แต่ละสินค้า → จำนวนคงเหลือ (หมด = 0 ไม่หาย) + ซีเรียลพร้อมเวลานำเข้า/สถานะ
 */
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Boxes, Search, Loader2, ArrowLeft, ChevronDown, Package, Clock, User, Download, FileSpreadsheet,
  Trash2, RotateCcw,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

type Item = {
  id: string; serial_number: string; barcode: string | null; sku: string | null
  product_name: string | null; brand: string | null; image_url: string | null
  status: string; in_at: string; sold_at: string | null; in_by_name: string | null
}

export default function EmployeeStockPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [mine, setMine] = useState(false)
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [exporting, setExporting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams({ view: "items", status: "all" })
      if (mine) p.set("mine", "1")
      const res = await fetch(`/api/stock/summary?${p}`)
      const d = await res.json()
      setItems(res.ok ? (d.items ?? []) : [])
    } catch { setItems([]) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [mine]) // eslint-disable-line

  // อายุในคลัง (วัน) + ลบ/กู้คืน
  const daysIn = (s: string) => { try { return Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 86400000)) } catch { return 0 } }
  const ageBetween = (a: string, b: string) => { try { return Math.max(0, Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000)) } catch { return 0 } }
  const [actingId, setActingId] = useState<string | null>(null)
  async function act(id: string, action: "remove" | "restore") {
    if (action === "remove" && !confirm("เอาสินค้านี้ออกจากสต๊อก? (กู้คืนได้ภายหลัง)")) return
    setActingId(id)
    try {
      const res = await fetch("/api/stock/item", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ไม่สำเร็จ"); return }
      setItems(prev => prev.map(it => it.id === id ? { ...it, status: d.status } : it))
      toast.success(action === "remove" ? "เอาออกแล้ว" : "กู้คืนแล้ว")
    } catch { toast.error("Error") } finally { setActingId(null) }
  }

  // filter ตามช่วงวันที่นำเข้า (in_at) + คำค้น
  const filteredItems = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return items.filter(it => {
      const d = (it.in_at || "").slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      if (kw && ![it.serial_number, it.barcode, it.product_name, it.brand].filter(Boolean).join(" ").toLowerCase().includes(kw)) return false
      return true
    })
  }, [items, q, from, to])

  // group by product
  const products = useMemo(() => {
    const rows = filteredItems
    const map = new Map<string, any>()
    for (const it of rows) {
      const key = it.barcode || it.sku || it.product_name || it.id
      if (!map.has(key)) map.set(key, {
        key, name: it.product_name || it.sku || "(ไม่ระบุ)", brand: it.brand, barcode: it.barcode,
        image_url: it.image_url, inStock: 0, sold: 0, serials: [] as Item[],
      })
      const g = map.get(key)
      if (it.status === "in_stock") g.inStock++; else if (it.status === "sold") g.sold++
      g.serials.push(it)
    }
    return Array.from(map.values())
      .map(g => { g.serials.sort((a: Item, b: Item) => (b.in_at || "").localeCompare(a.in_at || "")); return g })
      .sort((a, b) => (b.inStock - a.inStock) || (b.sold - a.sold))
  }, [filteredItems])

  const totalIn = products.reduce((n, p) => n + p.inStock, 0)

  const fmt = (s: string) => { try { return format(new Date(s), "d MMM yy · HH:mm น.", { locale: th }) } catch { return s } }
  const fmtCell = (s: string | null) => { try { return s ? format(new Date(s), "yyyy-MM-dd HH:mm") : "" } catch { return s || "" } }
  const rangeSuffix = (from || to) ? `_${from || "all"}_${to || "now"}` : ""

  // ดาวน์โหลด workbook แบบ Blob (มือถือรองรับดีกว่า XLSX.writeFile)
  function downloadWb(wb: XLSX.WorkBook, filename: string) {
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
    const a = document.createElement("a")
    a.href = url; a.download = filename; document.body.appendChild(a); a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 1000)
  }

  // ── ดาวน์โหลดสต๊อก (Excel 2 ชีต: สรุป + รายซีเรียล) — โหลดได้แม้สต๊อกเป็น 0/หมด ──
  function exportStock() {
    if (filteredItems.length === 0) { toast.error("ไม่มีข้อมูลในช่วงวันที่ที่เลือก"); return }
    const summary = products.map((p: any) => ({
      "สินค้า": p.name, "แบรนด์": p.brand || "", "Barcode": p.barcode || "",
      "คงเหลือ": p.inStock, "ขายไป": p.sold, "สถานะ": p.inStock === 0 ? "หมด" : "มีของ",
    }))
    const serials = filteredItems.map(it => ({
      "Serial": it.serial_number, "สินค้า": it.product_name || "", "Barcode": it.barcode || "",
      "นำเข้าเมื่อ": fmtCell(it.in_at),
      "อายุในคลัง (วัน)": it.status === "sold" && it.sold_at ? ageBetween(it.in_at, it.sold_at) : daysIn(it.in_at),
      "ผู้นำเข้า": it.in_by_name || "",
      "สถานะ": it.status === "in_stock" ? "คงเหลือ" : it.status === "sold" ? "ขายแล้ว" : it.status,
      "ขายเมื่อ": fmtCell(it.sold_at),
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "สรุปสินค้า")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(serials), "รายซีเรียล")
    downloadWb(wb, `stock${mine ? "-mine" : ""}${rangeSuffix}.xlsx`)
    toast.success(`ดาวน์โหลด ${summary.length} สินค้า · ${serials.length} ซีเรียล`)
  }

  // ── ดาวน์โหลดยอดขายของฉัน (Excel ตามช่วงวันที่) ──
  async function exportMySales() {
    setExporting(true)
    try {
      const sp = new URLSearchParams({ scope: "me", limit: "10000" })
      if (from) sp.set("start", from)
      if (to) sp.set("end", to)
      const res = await fetch(`/api/products/sales?${sp}`)
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "โหลดไม่สำเร็จ"); return }
      const sales = (d.sales ?? []).map((s: any) => ({
        "วันที่": s.sold_date, "เวลา": s.sold_at ? format(new Date(s.sold_at), "HH:mm") : "",
        "สินค้า": s.product_name, "แบรนด์": s.brand || "", "Barcode": s.barcode || "", "SN": s.sn || "",
        "จำนวน": s.qty || 1, "ราคา/ชิ้น": Number(s.sold_price), "รวม": Number(s.sold_price) * (s.qty || 1),
        "สาขา": s.branch_name || "", "ช่องทาง": s.sales_channel || "", "Order": s.order_number || "",
      }))
      if (sales.length === 0) { toast.error("ไม่มียอดขายในช่วงนี้"); return }
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sales), "ยอดขายของฉัน")
      downloadWb(wb, `my-sales${rangeSuffix}.xlsx`)
      toast.success(`ดาวน์โหลด ${sales.length} รายการ`)
    } catch { toast.error("เกิดข้อผิดพลาด") } finally { setExporting(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* header */}
      <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 px-4 pb-6 pt-5 text-white">
        <div className="flex items-center gap-2">
          <Link href="/app/sales" className="rounded-lg p-1.5 hover:bg-white/20"><ArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-lg font-black"><Boxes size={20} /> สต๊อกของฉัน</h1>
            <p className="text-[11px] opacity-90">{mine ? "เฉพาะที่ฉันนำเข้า" : "สต๊อกสาขาของฉัน"} · คงเหลือ {totalIn} ชิ้น</p>
          </div>
        </div>
        {/* toggle */}
        <div className="mt-3 flex gap-1 rounded-xl bg-white/20 p-1 backdrop-blur">
          <button onClick={() => setMine(false)} className={"flex-1 rounded-lg py-1.5 text-xs font-black " + (!mine ? "bg-white text-emerald-700" : "text-white/90")}>ทั้งสาขา</button>
          <button onClick={() => setMine(true)} className={"flex-1 rounded-lg py-1.5 text-xs font-black " + (mine ? "bg-white text-emerald-700" : "text-white/90")}>ที่ฉันนำเข้า</button>
        </div>
      </div>

      <div className="px-4 -mt-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาสินค้า / serial / barcode"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none focus:border-emerald-400" />
        </div>
      </div>

      {/* ช่วงวันที่ + ดาวน์โหลด Excel */}
      <div className="mt-2 px-4">
        <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span>ช่วงวันที่นำเข้า</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none" />
            <span>–</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none" />
            {(from || to) && <button onClick={() => { setFrom(""); setTo("") }} className="text-slate-400">ล้าง</button>}
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={exportStock}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-black text-white active:scale-[0.98]">
              <FileSpreadsheet size={14} /> สต๊อก (Excel)
            </button>
            <button onClick={exportMySales} disabled={exporting}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-black text-white active:scale-[0.98] disabled:opacity-60">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} ยอดขายของฉัน
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 px-4">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-400" /></div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white py-14 text-center text-sm text-slate-400">
            <Package size={30} className="mx-auto mb-2 text-slate-300" /> ยังไม่มีสต๊อก
          </div>
        ) : products.map(p => {
          const isOpen = open.has(p.key)
          const out = p.inStock === 0
          return (
            <div key={p.key} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <button onClick={() => setOpen(prev => { const n = new Set(prev); n.has(p.key) ? n.delete(p.key) : n.add(p.key); return n })}
                className="flex w-full items-center gap-3 p-3 text-left">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
                  {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <Package size={18} className="text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{p.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{p.brand || ""}{p.barcode ? ` · ${p.barcode}` : ""}</p>
                </div>
                <div className="shrink-0 text-right">
                  {out ? (
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-600">หมด</span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-black text-emerald-700">เหลือ {p.inStock}</span>
                  )}
                  {p.sold > 0 && <p className="mt-0.5 text-[10px] text-slate-400">ขายไป {p.sold}</p>}
                </div>
                <ChevronDown size={16} className={"shrink-0 text-slate-400 transition-transform " + (isOpen ? "rotate-180" : "")} />
              </button>

              {isOpen && (
                <div className="border-t border-slate-50">
                  {p.serials.map((s: Item) => (
                    <div key={s.id} className={"flex items-start gap-2 border-b border-slate-50 px-4 py-2 last:border-0 " + (s.status === "removed" ? "opacity-60" : "")}>
                      <div className={"mt-1 h-2 w-2 shrink-0 rounded-full " + (s.status === "in_stock" ? "bg-emerald-500" : s.status === "removed" ? "bg-rose-400" : "bg-slate-300")} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[13px] font-bold text-slate-700">{s.serial_number}</p>
                        <p className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5"><Clock size={9} /> {fmt(s.in_at)}</span>
                          {s.status === "in_stock" && <span className="font-bold text-amber-600">· อยู่คลัง {daysIn(s.in_at)} วัน</span>}
                          {s.in_by_name && <span className="flex items-center gap-0.5"><User size={9} /> {s.in_by_name}</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + (s.status === "in_stock" ? "bg-emerald-50 text-emerald-600" : s.status === "removed" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500")}>
                          {s.status === "in_stock" ? "คงเหลือ" : s.status === "removed" ? "เอาออกแล้ว" : "ขายแล้ว"}
                        </span>
                        {s.status === "in_stock" && (
                          <button onClick={() => act(s.id, "remove")} disabled={actingId === s.id} title="เอาออก (ไม่ได้ขาย)"
                            className="rounded-lg p-1 text-rose-400 hover:bg-rose-50">
                            {actingId === s.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        )}
                        {s.status === "removed" && (
                          <button onClick={() => act(s.id, "restore")} disabled={actingId === s.id} title="กู้คืน"
                            className="rounded-lg p-1 text-emerald-500 hover:bg-emerald-50">
                            {actingId === s.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
