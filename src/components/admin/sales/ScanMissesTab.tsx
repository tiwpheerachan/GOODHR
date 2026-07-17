"use client"
/**
 * ScanMissesTab — สินค้าสแกนไม่เจอ (scan_misses) — แท็บในหน้าขายสินค้า PC
 *   บาร์โค้ด/ซีเรียลที่พนักงานสแกนแล้วไม่มีในระบบ → เอาไปเติม master data
 */
import { useEffect, useMemo, useState } from "react"
import {
  PackageSearch, Search, Loader2, Download, Trash2, CheckCircle2, Circle,
  Barcode, Hash, Clock,
} from "lucide-react"
import toast from "react-hot-toast"

type Miss = {
  id: string
  code_norm: string
  sample_code: string | null
  scan_type: "barcode" | "serial"
  hits: number
  first_seen: string
  last_seen: string
  resolved: boolean
  note: string | null
  last_employee_name: string | null
  last_employee_code: string | null
}

export default function ScanMissesTab() {
  const [items, setItems] = useState<Miss[]>([])
  const [totalUnresolved, setTotalUnresolved] = useState(0)
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<"all" | "barcode" | "serial">("all")
  const [status, setStatus] = useState<"unresolved" | "resolved" | "all">("unresolved")
  const [q, setQ] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status })
      if (type !== "all") params.set("type", type)
      if (q.trim()) params.set("q", q.trim())
      const res = await fetch(`/api/admin/scan-misses?${params}`)
      const d = await res.json()
      setItems(d.items ?? [])
      setTotalUnresolved(d.total_unresolved ?? 0)
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [type, status]) // eslint-disable-line
  useEffect(() => {
    const id = setTimeout(load, 300)
    return () => clearTimeout(id)
  }, [q]) // eslint-disable-line

  async function toggleResolved(m: Miss) {
    setBusyId(m.id)
    try {
      const res = await fetch("/api/admin/scan-misses", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, resolved: !m.resolved }),
      })
      if (!res.ok) { toast.error("Error"); return }
      setItems(prev => prev.map(x => x.id === m.id ? { ...x, resolved: !x.resolved } : x))
      setTotalUnresolved(n => n + (m.resolved ? 1 : -1))
      toast.success(m.resolved ? "กลับเป็นค้าง" : "ทำเครื่องหมายจัดการแล้ว")
    } catch { toast.error("Error") } finally { setBusyId(null) }
  }

  async function del(id: string) {
    if (!confirm("ลบรายการนี้?")) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/scan-misses?id=${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Error"); return }
      setItems(prev => prev.filter(x => x.id !== id))
    } catch { toast.error("Error") } finally { setBusyId(null) }
  }

  function exportCsv() {
    const rows = [["code", "ชนิด", "จำนวนครั้ง", "สแกนล่าสุด", "โดย", "สถานะ", "หมายเหตุ"]]
    items.forEach(m => rows.push([
      m.sample_code || m.code_norm, m.scan_type, String(m.hits),
      fmtDate(m.last_seen), m.last_employee_name || "", m.resolved ? "จัดการแล้ว" : "ค้าง", m.note || "",
    ]))
    const csv = "﻿" + rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url; a.download = `scan-misses.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const shown = useMemo(() => items, [items])

  return (
    <div>
      {/* stat + export */}
      <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-5 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-bold text-amber-700">รายการค้างเติมข้อมูล (สแกนไม่เจอ)</p>
          <p className="mt-1 text-3xl font-black text-slate-800">{totalUnresolved} <span className="text-sm font-bold text-slate-400">code</span></p>
          <p className="text-[11px] text-amber-500 mt-0.5">บาร์โค้ด/ซีเรียลที่สแกนแล้วไม่มีในระบบ · เอาไปเติมข้อมูลสินค้า</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PackageSearch size={36} className="text-amber-300" />
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([
          { k: "unresolved", label: "ค้าง" },
          { k: "resolved", label: "จัดการแล้ว" },
          { k: "all", label: "ทั้งหมด" },
        ] as const).map(s => (
          <button key={s.k} onClick={() => setStatus(s.k)}
            className={"rounded-xl px-3 py-2 text-sm font-bold transition-colors " +
              (status === s.k ? "bg-[#0f2a4a] text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")}>
            {s.label}
          </button>
        ))}
        <div className="mx-1 h-6 w-px bg-slate-200" />
        {([
          { k: "all", label: "ทุกชนิด" },
          { k: "barcode", label: "บาร์โค้ด" },
          { k: "serial", label: "ซีเรียล" },
        ] as const).map(s => (
          <button key={s.k} onClick={() => setType(s.k)}
            className={"rounded-xl px-3 py-2 text-sm font-bold transition-colors " +
              (type === s.k ? "bg-slate-700 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")}>
            {s.label}
          </button>
        ))}
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหา code"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0f2a4a]" />
        </div>
      </div>

      {/* list */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-300" /></div>
        ) : shown.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <CheckCircle2 size={30} className="mx-auto mb-2 text-emerald-300" />
            <p className="text-sm">ไม่มีรายการค้าง — สแกนเจอครบทุกตัว 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {shown.map(m => (
              <div key={m.id} className={"flex items-center gap-3 px-4 py-3 " + (m.resolved ? "opacity-60" : "")}>
                <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " +
                  (m.scan_type === "barcode" ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600")}>
                  {m.scan_type === "barcode" ? <Barcode size={16} /> : <Hash size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-bold text-slate-800">{m.sample_code || m.code_norm}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
                    <span className={"font-bold " + (m.scan_type === "barcode" ? "text-sky-500" : "text-violet-500")}>
                      {m.scan_type === "barcode" ? "บาร์โค้ด" : "ซีเรียล"}
                    </span>
                    <span className="flex items-center gap-0.5"><Clock size={10} /> {fmtDate(m.last_seen)}</span>
                    {m.last_employee_name && <span>· {m.last_employee_name}</span>}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-black text-rose-600" title="จำนวนครั้งที่สแกนไม่เจอ">
                  ×{m.hits}
                </span>
                <button onClick={() => toggleResolved(m)} disabled={busyId === m.id}
                  className={"shrink-0 rounded-lg p-2 " + (m.resolved ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-100")}
                  title={m.resolved ? "จัดการแล้ว (กดเพื่อยกเลิก)" : "ทำเครื่องหมายจัดการแล้ว"}>
                  {busyId === m.id ? <Loader2 size={16} className="animate-spin" /> : m.resolved ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
                <button onClick={() => del(m.id)} disabled={busyId === m.id}
                  className="shrink-0 rounded-lg p-2 text-rose-400 hover:bg-rose-50" title="ลบ">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  } catch { return s }
}
