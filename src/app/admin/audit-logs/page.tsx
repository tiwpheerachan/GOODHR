"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { ScrollText, Search, ChevronLeft, ChevronRight, Filter, Clock, User, FileText } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"

const ACTION_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  calculate: "bg-blue-100 text-blue-700",
  bulk_calculate: "bg-blue-100 text-blue-700",
  create: "bg-indigo-100 text-indigo-700",
  update: "bg-amber-100 text-amber-700",
  edit: "bg-amber-100 text-amber-700",
  delete: "bg-red-100 text-red-700",
  deactivate: "bg-red-100 text-red-700",
}

const ACTION_ICONS: Record<string, string> = {
  approved: "✅", rejected: "❌", calculate: "🧮", bulk_calculate: "🧮",
  create: "➕", update: "✏️", edit: "✏️", delete: "🗑️", deactivate: "⛔",
}

function getActionColor(action: string) {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return cls
  }
  return "bg-slate-100 text-slate-600"
}

function getActionIcon(action: string) {
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (action.includes(key)) return icon
  }
  return "📋"
}

export default function AuditLogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [filterType, setFilterType] = useState("")
  const [search, setSearch] = useState("")
  const pageSize = 30

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(page * pageSize) })
    if (filterType) params.set("entity_type", filterType)
    const res = await fetch(`/api/admin/audit-logs?${params}`)
    const data = await res.json()
    setLogs(data.logs || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, filterType])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? logs.filter(l => l.description?.toLowerCase().includes(search.toLowerCase()) || l.actor_name?.toLowerCase().includes(search.toLowerCase()) || l.action?.includes(search.toLowerCase()))
    : logs

  const totalPages = Math.ceil(total / pageSize)

  const ENTITY_TYPES = [
    { value: "", label: "ทั้งหมด" },
    { value: "leave_request", label: "คำขอลา" },
    { value: "overtime_request", label: "คำขอ OT" },
    { value: "time_adjustment_request", label: "แก้เวลา" },
    { value: "payroll", label: "เงินเดือน" },
    { value: "employee", label: "พนักงาน" },
    { value: "shift_change_request", label: "เปลี่ยนกะ" },
    { value: "resignation_request", label: "ลาออก" },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <ScrollText size={18} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">Audit Log</h1>
            <p className="text-xs text-slate-400">ประวัติการดำเนินการทั้งหมด · {total.toLocaleString()} รายการ</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white rounded-xl border border-slate-200 px-3 py-2">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา..."
            className="flex-1 text-sm outline-none" />
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 px-3 py-2">
          <Filter size={14} className="text-slate-400" />
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0) }}
            className="text-sm outline-none bg-transparent">
            {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <ScrollText size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">ยังไม่มีประวัติ</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(log => (
              <div key={log.id} className="px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
                    {getActionIcon(log.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-relaxed">{log.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <User size={10} /> {log.actor_name || "ระบบ"}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock size={10} /> {formatDistanceToNow(new Date(log.created_at), { locale: th, addSuffix: true })}
                      </span>
                      {log.entity_type && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <FileText size={10} /> {log.entity_type.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && log.metadata.changes && (
                      <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2 text-[11px] text-slate-500">
                        {Object.entries(log.metadata.changes as Record<string, { old: any; new: any }>).map(([key, val]) => (
                          <div key={key}><strong>{key}:</strong> {String(val.old)} → {String(val.new)}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <div className="text-[10px] text-slate-300 flex-shrink-0 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 disabled:opacity-30">
              <ChevronLeft size={14} /> ก่อนหน้า
            </button>
            <span className="text-xs text-slate-400">หน้า {page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 disabled:opacity-30">
              ถัดไป <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
