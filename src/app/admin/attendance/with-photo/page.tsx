"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  Camera, Clock, MapPin, Loader2, ChevronRight, Eye,
  User, Calendar, RefreshCw, Download, Search, LogIn, LogOut, X,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type WithPhotoRecord = {
  id: string
  employee_id: string
  company_id: string
  work_date: string
  clock_in: string | null
  clock_out: string | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_out_lat: number | null
  clock_out_lng: number | null
  clock_in_photo_url: string | null
  clock_out_photo_url: string | null
  clock_in_address: string | null
  clock_out_address: string | null
  clock_in_with_photo: boolean
  clock_out_with_photo: boolean
  late_minutes: number
  early_out_minutes: number
  work_minutes: number
  status: string
  employee: {
    id: string
    employee_code: string
    first_name_th: string
    last_name_th: string
    avatar_url: string | null
    department: { name: string } | null
    position: { name: string } | null
  } | null
}

const PER_PAGE = 50

function todayBKK() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
}
function daysAgoBKK(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
}

export default function WithPhotoReviewPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState<WithPhotoRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [previewImg, setPreviewImg] = useState<{ url: string; meta?: string } | null>(null)

  // ── filter state ──
  const [dateFrom, setDateFrom] = useState(daysAgoBKK(7))
  const [dateTo, setDateTo]     = useState(todayBKK())
  const [q, setQ]               = useState("")
  const [qDeb, setQDeb]         = useState("")

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q), 400)
    return () => clearTimeout(t)
  }, [q])

  // ── fetch ──
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setPage(1)
    try {
      const params = new URLSearchParams({
        date_from: dateFrom, date_to: dateTo,
        q: qDeb, page: "1", limit: String(PER_PAGE),
      })
      const res = await fetch(`/api/checkin/with-photo/list?${params}`)
      const data = await res.json()
      if (data.success) {
        setRecords(data.data || [])
        setTotal(data.total || 0)
        setHasMore((data.data || []).length < (data.total || 0))
      } else {
        toast.error(data.error || "โหลดข้อมูลไม่สำเร็จ")
        setRecords([]); setTotal(0); setHasMore(false)
      }
    } catch (err) {
      console.error(err)
      toast.error("โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, qDeb])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // ── load more ──
  const loadMore = async () => {
    const next = page + 1
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({
        date_from: dateFrom, date_to: dateTo, q: qDeb,
        page: String(next), limit: String(PER_PAGE),
      })
      const res = await fetch(`/api/checkin/with-photo/list?${params}`)
      const data = await res.json()
      if (data.success) {
        const more = data.data || []
        setRecords(prev => [...prev, ...more])
        setPage(next)
        setHasMore(records.length + more.length < (data.total || 0))
      }
    } catch {
      toast.error("โหลดเพิ่มไม่สำเร็จ")
    } finally {
      setLoadingMore(false)
    }
  }

  // ── export ──
  const exportXlsx = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        date_from: dateFrom, date_to: dateTo, q: qDeb,
        page: "1", limit: "9999",
      })
      const res = await fetch(`/api/checkin/with-photo/list?${params}`)
      const data = await res.json()
      if (!data.success || !data.data?.length) {
        toast.error("ไม่มีข้อมูลสำหรับ export")
        return
      }
      const rows = (data.data as WithPhotoRecord[]).map((r, i) => ({
        "ลำดับ": i + 1,
        "รหัสพนักงาน": r.employee?.employee_code || "",
        "ชื่อ-นามสกุล": r.employee ? `${r.employee.first_name_th} ${r.employee.last_name_th}` : "",
        "แผนก": r.employee?.department?.name || "",
        "ตำแหน่ง": r.employee?.position?.name || "",
        "วันที่": format(new Date(r.work_date + "T00:00:00"), "dd/MM/yyyy"),
        "เช็คอิน": r.clock_in ? format(new Date(r.clock_in), "HH:mm:ss") : "",
        "ที่อยู่เช็คอิน": r.clock_in_address || "",
        "เช็คเอ้าท์": r.clock_out ? format(new Date(r.clock_out), "HH:mm:ss") : "",
        "ที่อยู่เช็คเอ้าท์": r.clock_out_address || "",
        "สาย (นาที)": r.late_minutes || 0,
        "ทำงาน (นาที)": r.work_minutes || 0,
        "สถานะ": r.status,
      }))
      const XLSX = await import("xlsx")
      const ws = XLSX.utils.json_to_sheet(rows)
      ws["!cols"] = [
        { wch: 6 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 20 },
        { wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 10 }, { wch: 28 },
        { wch: 10 }, { wch: 12 }, { wch: 12 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "เช็คอินแนบรูป")
      XLSX.writeFile(wb, `checkin_with_photo_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`)
      toast.success(`Export สำเร็จ ${rows.length} รายการ`)
    } catch (err) {
      console.error(err)
      toast.error("Export ไม่สำเร็จ")
    } finally {
      setExporting(false)
    }
  }

  // ── stats ──
  const stats = (() => {
    let inCount = 0, outCount = 0, late = 0
    for (const r of records) {
      if (r.clock_in_with_photo) inCount++
      if (r.clock_out_with_photo) outCount++
      if ((r.late_minutes || 0) > 0) late++
    }
    return { inCount, outCount, late, total: records.length }
  })()

  const setQuickRange = (days: number) => {
    setDateFrom(daysAgoBKK(days - 1))
    setDateTo(todayBKK())
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}>
              <Camera size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">เช็คอินแนบรูป</h1>
              <p className="text-xs text-gray-400">รายการเช็คอินที่ถ่ายภาพ + ที่อยู่ (อยู่ในรัศมีสาขา)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportXlsx} disabled={exporting || loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-50">
              {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Export
            </button>
            <button onClick={fetchRecords}
              className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 active:scale-95 transition-all">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter row ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 text-[12px]">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 outline-none focus:border-indigo-300" />
          <span className="text-gray-300">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 outline-none focus:border-indigo-300" />
        </div>
        <div className="flex gap-1">
          {[{ d: 1, l: "วันนี้" }, { d: 7, l: "7 วัน" }, { d: 30, l: "30 วัน" }].map(p => (
            <button key={p.d} onClick={() => setQuickRange(p.d)}
              className="px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-500 text-[11px] font-semibold border border-gray-100 hover:bg-gray-100 transition-all">
              {p.l}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อ / รหัสพนักงาน"
            className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-gray-200 text-[12px] text-gray-700 placeholder-gray-300 outline-none focus:border-indigo-300" />
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <StatCard color="bg-indigo-50 text-indigo-600" label="ทั้งหมด" value={total} sub={`แสดง ${records.length}`} />
        <StatCard color="bg-emerald-50 text-emerald-600" label="เช็คอิน" value={stats.inCount} icon={<LogIn size={11} />} />
        <StatCard color="bg-rose-50 text-rose-600" label="เช็คเอ้าท์" value={stats.outCount} icon={<LogOut size={11} />} />
        <StatCard color="bg-amber-50 text-amber-600" label="มีสาย" value={stats.late} icon={<Clock size={11} />} />
      </div>

      {/* ── Content ── */}
      <div className="px-6 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Camera size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-400">ไม่พบรายการ</p>
            <p className="text-xs text-gray-400 mt-1">ลองเปลี่ยนช่วงวันที่หรือคำค้นหา</p>
          </div>
        ) : (
          <>
            {records.map(r => <RecordCard key={r.id} r={r} onPreview={setPreviewImg} />)}

            {hasMore && (
              <div className="flex justify-center pt-2 pb-4">
                <button onClick={loadMore} disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 active:scale-[.98] transition-all disabled:opacity-50 shadow-sm">
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} className="rotate-90" />}
                  {loadingMore ? "กำลังโหลด..." : `โหลดเพิ่ม (เหลือ ${total - records.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Preview ── */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setPreviewImg(null)}>
          <button onClick={() => setPreviewImg(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20">
            <X size={18} />
          </button>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img src={previewImg.url} alt="Preview" className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
            {previewImg.meta && (
              <p className="text-center text-white/80 text-xs mt-2.5 font-medium">{previewImg.meta}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ color, label, value, sub, icon }: { color: string; label: string; value: number; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase opacity-80">
        {icon} {label}
      </div>
      <p className="text-xl font-black mt-0.5">{value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

function RecordCard({ r, onPreview }: { r: WithPhotoRecord; onPreview: (p: { url: string; meta?: string }) => void }) {
  const emp = r.employee
  const isLate = (r.late_minutes || 0) > 0
  const isEarly = (r.early_out_minutes || 0) > 0
  const fullName = emp ? `${emp.first_name_th} ${emp.last_name_th}` : "—"

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
        {emp?.avatar_url
          ? <img src={emp.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
          : <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
              {emp?.first_name_th?.[0] ?? "?"}
            </div>}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-800 truncate">
            {fullName}
            <span className="text-gray-400 font-normal ml-1.5">({emp?.employee_code})</span>
          </p>
          <p className="text-[10px] text-gray-400">
            {emp?.department?.name ?? "—"} · {emp?.position?.name ?? "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 font-medium">
            {format(new Date(r.work_date + "T00:00:00"), "d MMM yy", { locale: th })}
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            r.status === "present" ? "bg-emerald-50 text-emerald-600"
            : r.status === "late" ? "bg-amber-50 text-amber-600"
            : r.status === "absent" ? "bg-red-50 text-red-500"
            : "bg-gray-100 text-gray-500"
          }`}>{r.status}</span>
        </div>
      </div>

      {/* Photos */}
      <div className="grid grid-cols-2 divide-x divide-gray-50">
        {/* Clock-in */}
        <PhotoBlock
          kind="in"
          time={r.clock_in}
          photo={r.clock_in_photo_url}
          address={r.clock_in_address}
          lat={r.clock_in_lat}
          lng={r.clock_in_lng}
          extra={isLate ? `สาย ${r.late_minutes} นาที` : null}
          extraColor="text-amber-600"
          onPreview={(url) => onPreview({ url, meta: `${fullName} · เช็คอิน ${r.clock_in ? format(new Date(r.clock_in), "HH:mm:ss") : ""}` })}
        />
        {/* Clock-out */}
        <PhotoBlock
          kind="out"
          time={r.clock_out}
          photo={r.clock_out_photo_url}
          address={r.clock_out_address}
          lat={r.clock_out_lat}
          lng={r.clock_out_lng}
          extra={isEarly ? `ออกก่อน ${r.early_out_minutes} นาที` : (r.work_minutes ? `ทำงาน ${Math.floor(r.work_minutes / 60)}:${String(r.work_minutes % 60).padStart(2, "0")} ชม.` : null)}
          extraColor={isEarly ? "text-orange-600" : "text-gray-500"}
          onPreview={(url) => onPreview({ url, meta: `${fullName} · เช็คเอ้าท์ ${r.clock_out ? format(new Date(r.clock_out), "HH:mm:ss") : ""}` })}
        />
      </div>
    </div>
  )
}

function PhotoBlock({ kind, time, photo, address, lat, lng, extra, extraColor, onPreview }: {
  kind: "in" | "out"; time: string | null; photo: string | null; address: string | null;
  lat: number | null; lng: number | null; extra: string | null; extraColor?: string;
  onPreview: (url: string) => void;
}) {
  const isIn = kind === "in"
  if (!time) {
    return (
      <div className="p-3 flex items-center justify-center min-h-[120px] text-gray-300 text-xs font-medium">
        <span>{isIn ? "ยังไม่เช็คอิน" : "ยังไม่เช็คเอ้าท์"}</span>
      </div>
    )
  }
  return (
    <div className="p-3 flex gap-2.5">
      {photo ? (
        <button onClick={() => onPreview(photo)}
          className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0 group">
          <img src={photo} alt={kind} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Eye size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className={`absolute top-1 left-1 text-[8px] font-bold px-1 py-0.5 rounded ${isIn ? "bg-emerald-500" : "bg-rose-500"} text-white`}>
            {isIn ? "IN" : "OUT"}
          </div>
        </button>
      ) : (
        <div className="w-20 h-20 rounded-lg bg-gray-50 shrink-0 flex items-center justify-center text-gray-300">
          <Camera size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <div className={`flex items-center gap-1 text-[11px] font-bold ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
          {isIn ? <LogIn size={11} /> : <LogOut size={11} />}
          {format(new Date(time), "HH:mm:ss")}
        </div>
        {address && (
          <div className="flex items-start gap-1 text-[10px] text-gray-500">
            <MapPin size={10} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{address}</span>
          </div>
        )}
        {!address && lat && lng && (
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-indigo-500 hover:underline">
            <MapPin size={10} />
            {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
          </a>
        )}
        {extra && (
          <p className={`text-[10px] font-bold ${extraColor || "text-gray-500"}`}>{extra}</p>
        )}
      </div>
    </div>
  )
}
