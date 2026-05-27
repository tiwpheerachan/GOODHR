"use client"
// Admin view ของการบ้าน — เห็นทั้งหมดในระบบ (ไม่ filter ตามผู้มอบ)
// ใช้ component เดียวกับ manager แต่ filter ต่างกัน
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, ClipboardList, Loader2, Users, Store, Layers,
  CheckCircle2, ChevronRight, Trash2, Calendar, Filter, Search,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "completed" | "overdue">("all")

  const load = () => {
    setLoading(true)
    // Admin → ไม่ filter เพราะอยากเห็นทั้งระบบ
    fetch("/api/branch-eval/assignments").then(r => r.json()).then(d => {
      setAssignments(d.assignments ?? [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const del = async (id: string, title: string) => {
    if (!confirm(`ลบการบ้าน "${title}"? (ลบ targets ทั้งหมด แต่ฟอร์มที่ทำไปแล้วยังคงอยู่)`)) return
    const res = await fetch(`/api/branch-eval/assignments?id=${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("ลบไม่สำเร็จ"); return }
    toast.success("ลบแล้ว"); load()
  }

  const today = new Date().toISOString().slice(0, 10)
  const filtered = assignments.filter((a: any) => {
    const isDone = a._stats?.done === a._stats?.total && a._stats?.total > 0
    const isOverdue = a.due_date && a.due_date < today && !isDone
    if (statusFilter === "open" && isDone) return false
    if (statusFilter === "completed" && !isDone) return false
    if (statusFilter === "overdue" && !isOverdue) return false
    if (search.trim()) {
      const s = search.toLowerCase()
      const hay = `${a.title || ""} ${a.template?.name || ""} ${a.assigner?.first_name_th || ""} ${a.assigner?.last_name_th || ""}`.toLowerCase()
      if (!hay.includes(s)) return false
    }
    return true
  })

  // Stats
  const total = assignments.length
  const completedCount = assignments.filter((a: any) => a._stats?.done === a._stats?.total && a._stats?.total > 0).length
  const openCount = total - completedCount
  const overdueCount = assignments.filter((a: any) => {
    const isDone = a._stats?.done === a._stats?.total && a._stats?.total > 0
    return a.due_date && a.due_date < today && !isDone
  }).length

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      <Link href="/admin/branch-eval" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ระบบประเมินสาขา
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ClipboardList size={20} className="text-orange-500" /> 📋 การบ้าน (Admin View)
          </h2>
          <p className="text-slate-400 text-sm">เห็นทุกการบ้านในระบบ + ติดตามความคืบหน้า · {filtered.length}/{total}</p>
        </div>
        <p className="text-[11px] text-slate-500">
          สร้างได้จากฝั่ง <Link href="/app/branch-eval/manage/assignments" className="text-orange-600 hover:underline font-bold">หัวหน้า/Supervisor</Link>
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Stat color="slate" label="ทั้งหมด" value={total} />
        <Stat color="orange" label="กำลังทำ" value={openCount} />
        <Stat color="emerald" label="เสร็จแล้ว" value={completedCount} sub={`${total > 0 ? Math.round(completedCount/total*100) : 0}%`} />
        <Stat color="rose" label="เลยกำหนด" value={overdueCount} highlight={overdueCount > 0} />
      </div>

      {/* Filter */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-wrap gap-2 items-center shadow-sm">
        <Filter size={13} className="text-slate-400 ml-1" />
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา ชื่อการบ้าน / template / ผู้มอบ..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-orange-400" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="all">ทุกสถานะ</option>
          <option value="open">กำลังทำ</option>
          <option value="completed">เสร็จแล้ว</option>
          <option value="overdue">เลยกำหนด</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <ClipboardList size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-500">ไม่พบการบ้าน</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a: any) => {
            const stats = a._stats
            const isDone = stats.done === stats.total && stats.total > 0
            const overdue = a.due_date && a.due_date < today && !isDone
            return (
              <div key={a.id} className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${
                isDone ? "border-emerald-200"
                : overdue ? "border-rose-200"
                : "border-slate-100"
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isDone ? "bg-emerald-100 text-emerald-700"
                    : overdue ? "bg-rose-100 text-rose-700"
                    : "bg-orange-100 text-orange-700"
                  }`}>
                    <ClipboardList size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/branch-eval/assignments/${a.id}`}
                      className="font-black text-slate-800 hover:text-orange-700">
                      {a.title}
                    </Link>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      <Layers size={9} className="inline" /> {a.template?.name}
                      {a.assigner && <> · มอบโดย <b className="text-slate-700">{a.assigner.first_name_th} {a.assigner.last_name_th}</b></>}
                      {a.due_date && <> · <Calendar size={9} className="inline" /> ครบ {format(new Date(a.due_date), "d MMM yyyy", { locale: th })}</>}
                    </p>
                    {/* Progress */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${isDone ? "bg-emerald-500" : overdue ? "bg-rose-500" : "bg-orange-500"}`}
                          style={{ width: `${stats.progress}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-700">{stats.done}/{stats.total}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1"><Users size={9}/>{stats.assignee_count} คน</span>
                      <span className="inline-flex items-center gap-1"><Store size={9}/>{stats.branch_count} สาขา</span>
                      {isDone && <span className="text-emerald-700 font-bold inline-flex items-center gap-1"><CheckCircle2 size={9}/>เสร็จสิ้น</span>}
                      {overdue && <span className="text-rose-700 font-bold">เลยกำหนด</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => del(a.id, a.title)}
                      title="ลบการบ้าน (admin)"
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded">
                      <Trash2 size={12} />
                    </button>
                    <Link href={`/admin/branch-eval/assignments/${a.id}`}
                      className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ color, label, value, sub, highlight }: any) {
  const palette: Record<string, { bg: string; text: string; ring: string }> = {
    slate:   { bg: "bg-slate-50",   text: "text-slate-700",   ring: "ring-slate-200" },
    orange:  { bg: "bg-orange-50",  text: "text-orange-700",  ring: "ring-orange-300" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-700",    ring: "ring-rose-300" },
  }
  const p = palette[color]
  return (
    <div className={`${p.bg} border border-white rounded-2xl p-3 shadow-sm ${highlight ? `ring-2 ${p.ring}` : ""}`}>
      <p className={`text-[10px] font-bold uppercase ${p.text} opacity-80`}>{label}</p>
      <p className={`text-2xl font-black ${p.text} leading-tight mt-0.5`}>{value}</p>
      {sub && <p className={`text-[10px] font-bold ${p.text} opacity-60 mt-0.5`}>{sub}</p>}
    </div>
  )
}
