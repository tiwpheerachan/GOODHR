"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, FileText, Filter, Search, Loader2, Store, ChevronRight,
  Calendar, User, RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  draft:     { l: "ร่าง",     c: "bg-slate-100 text-slate-700" },
  submitted: { l: "รอรีวิว",  c: "bg-amber-100 text-amber-700" },
  reviewed:  { l: "รีวิวแล้ว", c: "bg-emerald-100 text-emerald-700" },
}

export default function EvaluationsListPage() {
  const [evals, setEvals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [branchFilter, setBranchFilter] = useState("")

  const load = () => {
    setLoading(true)
    fetch("/api/branch-eval/evaluations").then(r => r.json()).then(d => {
      setEvals(d.evaluations ?? [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const branchOpts = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of evals) if (e.branch) m.set(e.branch.id, e.branch.name)
    return Array.from(m, ([id, name]) => ({ id, name }))
  }, [evals])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return evals.filter(e => {
      if (statusFilter && e.status !== statusFilter) return false
      if (branchFilter && e.branch?.id !== branchFilter) return false
      if (s) {
        const hay = `${e.branch?.name ?? ""} ${e.template?.name ?? ""} ${e.evaluator?.first_name_th ?? ""} ${e.evaluator?.last_name_th ?? ""}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [evals, search, statusFilter, branchFilter])

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      <Link href="/admin/branch-eval" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ระบบประเมินสาขา
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ฟอร์มที่ส่งแล้ว</h2>
          <p className="text-slate-400 text-sm">{filtered.length} / {evals.length} ฟอร์ม</p>
        </div>
        <button onClick={load} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-wrap gap-2 items-center shadow-sm">
        <Filter size={13} className="text-slate-400 ml-1" />
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา ชื่อสาขา · template · ผู้กรอก..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-400" />
        </div>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">ทุกสาขา</option>
          {branchOpts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <FileText size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-500">ไม่พบฟอร์ม</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-50">
          {filtered.map(ev => {
            const S = STATUS_LABEL[ev.status]
            return (
              <Link key={ev.id} href={`/admin/branch-eval/evaluations/${ev.id}`}
                className="flex items-center gap-3 p-3 hover:bg-slate-50">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                  <Store size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-slate-800 truncate">{ev.branch?.name}</p>
                    <span className="text-[9px] font-black text-slate-500">{ev.branch?.code}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${S.c}`}>{S.l}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {ev.template?.name} · <Calendar size={9} className="inline" /> {format(new Date(ev.visit_date), "d MMM yyyy", { locale: th })}
                    {ev.evaluator && <> · <User size={9} className="inline" /> {ev.evaluator.first_name_th} {ev.evaluator.last_name_th}</>}
                  </p>
                </div>
                {ev.status !== "draft" && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-emerald-700">{Number(ev.percentage).toFixed(0)}%</p>
                    <p className="text-[9px] text-slate-400">{ev.total_score}/{ev.total_weight}</p>
                  </div>
                )}
                <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
