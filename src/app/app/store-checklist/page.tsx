"use client"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ClipboardList, Plus, Store, MapPin, ChevronRight, CalendarClock, CheckCircle2, Camera, Loader2 } from "lucide-react"

type Assignment = {
  id: string; template_id?: string; due_date?: string; note?: string; status: string
  template?: { name: string }; dealer?: { id: string; name: string; zone?: string; area?: string }
}
type Sub = {
  id: string; dealer_name?: string; visit_date: string; photos: any[]; lat?: number; lng?: number
  template?: { name: string }; dealer?: { name: string; zone?: string }
}

function Hub() {
  const sp = useSearchParams()
  const [asgs, setAsgs] = useState<Assignment[]>([])
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const done = sp.get("done") === "1"

  useEffect(() => {
    Promise.all([
      fetch("/api/branch-eval/store-checklist/assignments?mine=1").then(r => r.json()).catch(() => ({})),
      fetch("/api/branch-eval/store-checklist/submissions?mine=1").then(r => r.json()).catch(() => ({})),
    ]).then(([a, s]) => {
      setAsgs((a.assignments ?? []).filter((x: Assignment) => x.status === "open"))
      setSubs(s.submissions ?? [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-2">
        <ClipboardList size={20} className="text-indigo-600" />
        <h1 className="font-bold text-slate-800">เช็คลิสต์ร้านค้า</h1>
      </div>

      <div className="p-4 space-y-5 max-w-2xl mx-auto">
        {done && (
          <div className="bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle2 size={18} /> บันทึกเช็คลิสต์เรียบร้อยแล้ว
          </div>
        )}

        <Link href="/app/store-checklist/new"
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3.5 rounded-2xl shadow-sm">
          <Plus size={20} /> เริ่มเช็คลิสต์ใหม่
        </Link>

        {loading ? <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div> : (
          <>
            {/* งานที่ได้รับมอบหมาย */}
            {asgs.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><CalendarClock size={14} /> งานที่ได้รับมอบหมาย ({asgs.length})</h2>
                <div className="space-y-2">
                  {asgs.map(a => (
                    <Link key={a.id} href={`/app/store-checklist/new?assignment=${a.id}`}
                      className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 grid place-items-center text-amber-600"><Store size={18} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-800 truncate">{a.dealer?.name || "ร้านใดก็ได้"}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {a.template?.name || "เช็คลิสต์"}{a.due_date && ` · ครบกำหนด ${a.due_date}`}
                        </div>
                        {a.note && <div className="text-[11px] text-slate-400 truncate">{a.note}</div>}
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* บันทึกของฉัน */}
            <div>
              <h2 className="text-xs font-bold text-slate-500 mb-2">บันทึกล่าสุดของฉัน ({subs.length})</h2>
              {subs.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-400 shadow-sm">ยังไม่มีบันทึก</div>
              ) : (
                <div className="space-y-2">
                  {subs.map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 grid place-items-center text-indigo-600"><Store size={18} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-800 truncate">{s.dealer_name || s.dealer?.name || "—"}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>{s.visit_date}</span>
                          {s.template?.name && <span>· {s.template.name}</span>}
                          {(s.photos?.length ?? 0) > 0 && <span className="flex items-center gap-0.5"><Camera size={11} /> {s.photos.length}</span>}
                          {s.lat != null && <MapPin size={11} className="text-emerald-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>}><Hub /></Suspense>
}
