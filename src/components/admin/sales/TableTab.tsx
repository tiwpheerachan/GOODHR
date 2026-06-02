"use client"
import { useEffect, useState, useMemo } from "react"
import {
  Search, Filter, Download, Loader2, Package, RefreshCw, X,
  ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

export default function TableTab({ canSeeAll, canSeeTeam }: { canSeeAll: boolean; canSeeTeam: boolean }) {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")

  const [scope, setScope] = useState(canSeeAll ? "all" : canSeeTeam ? "team" : "me")
  const [start, setStart] = useState(monthStart)
  const [end, setEnd] = useState(today)
  const [filters, setFilters] = useState<{ [k: string]: string }>({
    branch_name: "", sales_channel: "", brand: "", category: "", source: "all", search: "",
  })
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "sold_at", dir: "desc" })
  const [showFilters, setShowFilters] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ scope, start, end })
      if (filters.branch_name) p.set("branch_name", filters.branch_name)
      if (filters.sales_channel) p.set("sales_channel", filters.sales_channel)
      if (filters.brand) p.set("brand", filters.brand)
      if (filters.category) p.set("category", filters.category)
      if (filters.source && filters.source !== "all") p.set("source", filters.source)
      p.set("limit", "5000")
      const res = await fetch(`/api/products/sales?${p}`)
      const d = await res.json()
      if (res.ok) setData(d)
      else toast.error(d.error || "โหลดไม่สำเร็จ")
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [scope, start, end, filters.branch_name, filters.sales_channel, filters.brand, filters.category, filters.source])

  const rows = useMemo(() => {
    if (!data?.sales) return []
    const s = filters.search.trim().toLowerCase()
    const arr = !s ? data.sales : data.sales.filter((x: any) => {
      const hay = `${x.product_name} ${x.brand || ""} ${x.barcode || ""} ${x.sn || ""} ${x.order_number || ""} ${x.branch_name || ""} ${x.sales_channel || ""} ${x.employee?.first_name_th || ""} ${x.employee?.last_name_th || ""} ${x.employee?.nickname || ""} ${x.employee?.employee_code || ""}`.toLowerCase()
      return hay.includes(s)
    })
    // sort
    const key = sortBy.key
    const sorted = [...arr].sort((a: any, b: any) => {
      let av = a[key], bv = b[key]
      if (key === "amount") { av = Number(a.sold_price) * (a.qty || 1); bv = Number(b.sold_price) * (b.qty || 1) }
      if (key === "employee") { av = a.employee?.first_name_th || ""; bv = b.employee?.first_name_th || "" }
      if (typeof av === "string") av = av.toLowerCase()
      if (typeof bv === "string") bv = bv.toLowerCase()
      const cmp = av > bv ? 1 : av < bv ? -1 : 0
      return sortBy.dir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [data, filters.search, sortBy])

  const PER_PAGE = 50
  const totalPages = Math.ceil(rows.length / PER_PAGE)
  const slice = rows.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  useEffect(() => { setPage(0) }, [filters.search, data])

  const totals = useMemo(() => {
    let amt = 0, qty = 0
    for (const r of rows) { amt += Number(r.sold_price) * (r.qty || 1); qty += r.qty || 1 }
    return { amount: amt, qty, count: rows.length }
  }, [rows])

  const exportXlsx = () => {
    if (!rows.length) { toast.error("ไม่มีข้อมูล"); return }
    const out = rows.map((s: any) => ({
      "Order No.": s.order_number || "",
      "Date": s.sold_date,
      "Time": format(new Date(s.sold_at), "HH:mm:ss"),
      "Branch": s.branch_name || s.branch?.name || "",
      "Sales Channel": s.sales_channel || "",
      "Employee": s.employee ? `${s.employee.first_name_th} ${s.employee.last_name_th}` : "(historical)",
      "Employee Code": s.employee?.employee_code || "",
      "Product Name": s.product_name,
      "Brand": s.brand || "",
      "Category": s.category || "",
      "Barcode": s.barcode || "",
      "SN": s.sn || "",
      "Qty": s.qty || 1,
      "Unit Price": Number(s.sold_price),
      "Total Sales": Number(s.sold_price) * (s.qty || 1),
      "Source": s.source || "",
      "Note": s.note || "",
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(out), "Sales")
    XLSX.writeFile(wb, `sales_${start}_${end}.xlsx`)
    toast.success(`ดาวน์โหลด ${out.length} แถว`)
  }

  const toggleSort = (key: string) => {
    setSortBy(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })
  }

  const facets = data?.facets || { branches: [], channels: [], brands: [], categories: [], sources: [] }
  const activeFilters = Object.entries(filters).filter(([k, v]) => v && v !== "all" && k !== "search").length

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
          {canSeeAll && <ScopeBtn active={scope === "all"} onClick={() => setScope("all")} label="ทั้งหมด"/>}
          {(canSeeAll || canSeeTeam) && <ScopeBtn active={scope === "team"} onClick={() => setScope("team")} label="ทีม"/>}
          <ScopeBtn active={scope === "me"} onClick={() => setScope("me")} label="ของฉัน"/>
        </div>
        <input type="date" value={start} onChange={e => setStart(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none"/>
        <span className="text-slate-400 text-xs">→</span>
        <input type="date" value={end} onChange={e => setEnd(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none"/>
        <div className="flex-1 min-w-[150px] flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
          <Search size={13} className="text-slate-400"/>
          <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="ค้นใน table (สินค้า/SN/order/พนง.)..." className="flex-1 bg-transparent outline-none text-xs"/>
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={"px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 " + (showFilters ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600")}>
          <Filter size={12}/> {activeFilters > 0 && <span className="bg-white/30 px-1 rounded text-[9px]">{activeFilters}</span>}
        </button>
        <button onClick={exportXlsx} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl flex items-center gap-1">
          <Download size={12}/> Export
        </button>
        <button onClick={load} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Refresh">
          <RefreshCw size={14} className={loading ? "animate-spin text-indigo-500" : "text-slate-500"}/>
        </button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="bg-gradient-to-br from-indigo-50/40 to-purple-50/40 rounded-2xl border border-indigo-100 p-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          <FilterSelect label="สาขา" value={filters.branch_name} options={facets.branches} onChange={(v: string) => setFilters(f => ({ ...f, branch_name: v }))}/>
          <FilterSelect label="ช่องทาง" value={filters.sales_channel} options={facets.channels} onChange={(v: string) => setFilters(f => ({ ...f, sales_channel: v }))}/>
          <FilterSelect label="แบรนด์" value={filters.brand} options={facets.brands} onChange={(v: string) => setFilters(f => ({ ...f, brand: v }))}/>
          <FilterSelect label="หมวด" value={filters.category} options={facets.categories} onChange={(v: string) => setFilters(f => ({ ...f, category: v }))}/>
          <FilterSelect label="ที่มา" value={filters.source} options={["manual", "import"]} onChange={(v: string) => setFilters(f => ({ ...f, source: v }))} all="ทุกที่มา"/>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Mini label="พบ" value={totals.count.toLocaleString()} sub="รายการ" color="indigo"/>
        <Mini label="จำนวน" value={totals.qty.toLocaleString()} sub="ชิ้น" color="amber"/>
        <Mini label="รวมยอด" value={`฿${totals.amount.toLocaleString()}`} sub="บาท" color="emerald"/>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            <Loader2 size={20} className="animate-spin mx-auto mb-2 text-indigo-400"/> กำลังโหลด...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            <Package size={28} className="mx-auto mb-2 text-slate-300"/>
            ไม่พบข้อมูลตามเงื่อนไข
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-left">
                  <SortableTh label="เวลา" sortKey="sold_at" sortBy={sortBy} onSort={toggleSort}/>
                  <Th>สาขา / ช่องทาง</Th>
                  <SortableTh label="พนักงาน" sortKey="employee" sortBy={sortBy} onSort={toggleSort}/>
                  <SortableTh label="สินค้า" sortKey="product_name" sortBy={sortBy} onSort={toggleSort}/>
                  <Th className="text-right">Qty</Th>
                  <SortableTh label="ราคา" sortKey="sold_price" sortBy={sortBy} onSort={toggleSort} align="right"/>
                  <SortableTh label="รวม" sortKey="amount" sortBy={sortBy} onSort={toggleSort} align="right"/>
                  <Th>SN / Order</Th>
                  <Th>ที่มา</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {slice.map((s: any) => (
                  <tr key={s.id} className={"hover:bg-slate-50/70 " + (s.source === "import" ? "bg-amber-50/30" : "")}>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <p className="font-mono font-bold text-slate-700">{s.sold_date}</p>
                      <p className="text-[9px] text-slate-400">{format(new Date(s.sold_at), "HH:mm")}</p>
                    </td>
                    <td className="px-2 py-1.5">
                      <p className="font-bold text-slate-700 truncate max-w-[140px]">{s.branch_name || s.branch?.name || "-"}</p>
                      <p className="text-[10px] text-indigo-600">{s.sales_channel || ""}</p>
                    </td>
                    <td className="px-2 py-1.5">
                      {s.employee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 overflow-hidden flex-shrink-0">
                            {s.employee.avatar_url && <img src={s.employee.avatar_url} alt="" className="w-full h-full object-cover"/>}
                          </div>
                          <p className="font-bold truncate max-w-[100px]">{s.employee.nickname || s.employee.first_name_th}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">(historical)</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        {s.proof_photo_url ? (
                          <a href={s.proof_photo_url} target="_blank" rel="noopener" className="w-7 h-7 rounded ring-2 ring-emerald-300 overflow-hidden flex-shrink-0 hover:scale-110 transition" title="ดูรูปประกอบ">
                            <img src={s.proof_photo_url} alt="" className="w-full h-full object-cover"/>
                          </a>
                        ) : s.product?.image_url && (
                          <img src={s.product.image_url} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0"/>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate max-w-[180px]">{s.product_name}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{s.barcode}{s.proof_photo_url && " · 📸"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums">{s.qty || 1}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">฿{Number(s.sold_price).toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right font-black text-emerald-700 tabular-nums">฿{(Number(s.sold_price) * (s.qty || 1)).toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-[10px] text-slate-500">
                      {s.sn && <p className="font-mono truncate max-w-[120px]">{s.sn}</p>}
                      {s.order_number && <p className="text-indigo-500">#{s.order_number}</p>}
                    </td>
                    <td className="px-2 py-1.5">
                      <SourceBadge source={s.source}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-center gap-1 bg-slate-50">
            <button onClick={() => setPage(0)} disabled={page === 0} className="p-1 disabled:opacity-30 hover:bg-white rounded"><ChevronsLeft size={12}/></button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 disabled:opacity-30 hover:bg-white rounded"><ChevronLeft size={12}/></button>
            <span className="px-3 text-xs text-slate-600 font-bold">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 disabled:opacity-30 hover:bg-white rounded"><ChevronRight size={12}/></button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="p-1 disabled:opacity-30 hover:bg-white rounded"><ChevronsRight size={12}/></button>
          </div>
        )}
      </div>
    </div>
  )
}

function ScopeBtn({ active, onClick, label }: any) {
  return (
    <button onClick={onClick}
      className={"px-3 py-1 rounded-lg text-[11px] font-black transition " + (active ? "bg-white shadow text-indigo-700" : "text-slate-500 hover:text-slate-700")}>
      {label}
    </button>
  )
}
function Mini({ label, value, sub, color }: any) {
  const c: any = { indigo: "from-indigo-500 to-blue-500", amber: "from-amber-500 to-orange-500", emerald: "from-emerald-500 to-teal-500" }
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5 relative overflow-hidden">
      <div className={`absolute -top-3 -right-3 w-12 h-12 rounded-full bg-gradient-to-br ${c[color]} opacity-10`}/>
      <p className="text-[9px] uppercase font-black text-slate-400">{label}</p>
      <p className="text-base font-black text-slate-800 leading-none mt-1">{value}</p>
      <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}
function FilterSelect({ label, value, options, onChange, all = "ทั้งหมด" }: any) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-500 uppercase mb-1">{label}</p>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400">
        <option value="">{all}</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
function Th({ children, className = "" }: any) {
  return <th className={`px-2 py-2 text-[10px] font-black uppercase text-slate-500 ${className}`}>{children}</th>
}
function SortableTh({ label, sortKey, sortBy, onSort, align = "left" }: any) {
  const active = sortBy.key === sortKey
  return (
    <th className={`px-2 py-2 text-[10px] font-black uppercase text-${align}`}>
      <button onClick={() => onSort(sortKey)} className={"inline-flex items-center gap-0.5 hover:text-indigo-600 " + (active ? "text-indigo-700" : "text-slate-500")}>
        {label}
        {active && (sortBy.dir === "asc" ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)}
      </button>
    </th>
  )
}
function SourceBadge({ source }: { source: string }) {
  if (source === "import") return <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">📥 Import</span>
  return <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">📷 สแกน</span>
}
