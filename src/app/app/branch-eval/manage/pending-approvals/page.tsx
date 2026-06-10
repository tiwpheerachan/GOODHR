"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  BadgeCheck, ClipboardCheck, Loader2, Search, Store, Calendar, User,
  ChevronRight, ArrowLeft, RefreshCw, AlertCircle, Filter,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

// ════════════════════════════════════════════════════════════════════
// หน้า "ฟอร์มรออนุมัติ" สำหรับหัวหน้า + admin
//   - แสดงฟอร์มที่ status='submitted' และ user เป็น supervisor หรือ target_manager
//   - admin เห็นทั้งหมด
// ════════════════════════════════════════════════════════════════════
export default function PendingApprovalsPage() {
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<"all" | "target_me" | "supervised">("all")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/branch-eval/evaluations?pending_for_me=1")
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "โหลดไม่สำเร็จ"); return }
      setList(d.evaluations ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // ── filter + search ──
  const filtered = useMemo(() => {
    let arr = list
    if (filter === "target_me") arr = arr.filter(e => e.target_manager_id)
    // ค้นใน branch / template / evaluator
    const s = q.trim().toLowerCase()
    if (s) {
      arr = arr.filter(e =>
        [e.branch?.name, e.branch?.code, e.template?.name,
         e.evaluator?.first_name_th, e.evaluator?.last_name_th, e.evaluator?.nickname,
         e.target_manager?.first_name_th, e.target_manager?.last_name_th,
        ].some(v => (v || "").toLowerCase().includes(s))
      )
    }
    return arr
  }, [list, q, filter])

  const byTargetMe = list.filter(e => e.target_manager).length
  const total = list.length

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-3 pb-12">
      <Link href="/app/branch-eval/manage"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14}/> ระบบประเมินสาขา
      </Link>

      {/* Hero header */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10"/>
        <div className="absolute bottom-2 right-12 w-20 h-20 rounded-full bg-white/5"/>
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <ClipboardCheck size={22}/>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black">ฟอร์มรออนุมัติ</h1>
            <p className="text-[11px] opacity-90 mt-0.5">ฟอร์มประเมินสาขาที่รอคุณตรวจและตัดสินใจ</p>
          </div>
          <button onClick={load} className="p-2 hover:bg-white/15 rounded-lg" title="Refresh">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""}/>
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 relative">
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5">
            <p className="text-[10px] uppercase opacity-80 font-bold">รออนุมัติทั้งหมด</p>
            <p className="text-2xl font-black mt-0.5">{total}</p>
            <p className="text-[10px] opacity-70">ฟอร์ม</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5">
            <p className="text-[10px] uppercase opacity-80 font-bold">ส่งถึงฉันตรง</p>
            <p className="text-2xl font-black mt-0.5">{byTargetMe}</p>
            <p className="text-[10px] opacity-70">ฟอร์ม</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[180px] flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
          <Search size={13} className="text-slate-400"/>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="ค้นสาขา / template / ผู้กรอก..."
            className="flex-1 bg-transparent outline-none text-sm"/>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
          {[
            { v: "all", l: "ทั้งหมด" },
            { v: "target_me", l: "ส่งถึงฉัน" },
          ].map(b => (
            <button key={b.v} onClick={() => setFilter(b.v as any)}
              className={"px-3 py-1 rounded-lg text-[11px] font-black transition " +
                (filter === b.v ? "bg-white shadow text-amber-700" : "text-slate-500 hover:text-slate-700")}>
              {b.l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Loader2 size={24} className="animate-spin mx-auto text-amber-400"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <BadgeCheck size={32} className="mx-auto mb-2 text-emerald-300"/>
          <p className="font-black text-slate-700">ไม่มีฟอร์มรออนุมัติ</p>
          <p className="text-xs text-slate-400 mt-0.5">ทุกฟอร์มผ่านการตัดสินใจหมดแล้ว เยี่ยม!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ev => (
            <Link key={ev.id} href={`/app/branch-eval/manage/evaluations/${ev.id}`}
              className="block bg-white rounded-2xl border border-slate-100 hover:border-amber-300 hover:shadow-md transition shadow-sm group">
              <div className="p-3 lg:p-4 flex items-center gap-3">
                {/* Score circle */}
                <div className={"w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-black " +
                  (ev.percentage >= 90 ? "bg-emerald-500 text-white"
                  : ev.percentage >= 75 ? "bg-sky-500 text-white"
                  : ev.percentage >= 60 ? "bg-amber-500 text-white"
                  : "bg-rose-500 text-white")}>
                  <p className="text-lg leading-none">{Number(ev.percentage).toFixed(0)}</p>
                  <p className="text-[8px] opacity-80">%</p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-black text-slate-800 text-sm truncate">{ev.branch?.name}</p>
                    <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{ev.branch?.code}</span>
                    {ev.target_manager && (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        🎯 ส่งถึงคุณ
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{ev.template?.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <Calendar size={10}/>
                      {format(new Date(ev.visit_date), "d MMM yy", { locale: th })}
                      {ev.visit_time && ` · ${ev.visit_time.slice(0, 5)}`}
                    </span>
                    {ev.evaluator && (
                      <span className="flex items-center gap-0.5">
                        <User size={10}/>
                        {ev.evaluator.nickname || ev.evaluator.first_name_th}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight size={16} className="text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition flex-shrink-0"/>
              </div>
              {/* ── quick info bar ── */}
              {ev.general_notes && (
                <div className="px-4 pb-2 pt-0">
                  <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-600 line-clamp-1">
                    <span className="font-bold">หมายเหตุผู้ตรวจ:</span> {ev.general_notes}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
