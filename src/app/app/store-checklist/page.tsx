"use client"
import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ClipboardList, Plus, Store, MapPin, ChevronRight, CalendarClock, CheckCircle2, Camera, Loader2, FileDown, FileText } from "lucide-react"
import { exportChecklistXlsx } from "@/lib/utils/store-checklist-export"

type Assignment = {
  id: string; template_id?: string; due_date?: string; note?: string; status: string
  template?: { name: string }; dealer?: { id: string; name: string; zone?: string; area?: string }
}
type Sub = {
  id: string; dealer_name?: string; visit_date: string; photos: any[]; lat?: number; lng?: number; status?: string
  template?: { name: string }; dealer?: { name: string; zone?: string }
}

function Hub() {
  const sp = useSearchParams()
  const [asgs, setAsgs] = useState<Assignment[]>([])
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const flash = sp.get("done") === "1" ? "ส่งเช็คลิสต์เรียบร้อยแล้ว" : sp.get("draft") === "1" ? "บันทึกร่างแล้ว" : ""

  useEffect(() => {
    Promise.all([
      fetch("/api/branch-eval/store-checklist/assignments?mine=1").then(r => r.json()).catch(() => ({})),
      fetch("/api/branch-eval/store-checklist/submissions?mine=1").then(r => r.json()).catch(() => ({})),
    ]).then(([a, s]) => {
      setAsgs((a.assignments ?? []).filter((x: Assignment) => x.status === "open"))
      setSubs(s.submissions ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const drafts = subs.filter(s => s.status === "draft")
  const done = subs.filter(s => s.status !== "draft")

  const exportMine = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/branch-eval/store-checklist/submissions?mine=1&full=1").then(r => r.json())
      const rows = (res.submissions ?? []).filter((s: any) => s.status !== "draft")
      if (rows.length === 0) { alert("ยังไม่มีบันทึกให้ดาวน์โหลด"); return }
      exportChecklistXlsx(rows, `เช็คลิสต์ร้านค้า_ของฉัน_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally { setExporting(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24">
      <div className="bg-white/95 backdrop-blur border-b sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 grid place-items-center text-teal-600"><Store size={17} /></div>
          <h1 className="font-bold text-slate-800 flex-1">เช็คลิสต์ร้านค้า</h1>
          <button onClick={exportMine} disabled={exporting || done.length === 0}
            className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-3xl mx-auto">
        {flash && (
          <div className="bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle2 size={18} /> {flash}
          </div>
        )}

        <Link href="/app/store-checklist/new"
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-sm transition">
          <Plus size={20} /> เริ่มเช็คลิสต์ใหม่
        </Link>

        {loading ? <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div> : (
          <>
            {/* งานที่ได้รับมอบหมาย */}
            {asgs.length > 0 && (
              <Section title={`งานที่ได้รับมอบหมาย (${asgs.length})`} icon={<CalendarClock size={14} />}>
                {asgs.map(a => (
                  <Link key={a.id} href={`/app/store-checklist/new?assignment=${a.id}`}
                    className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 hover:shadow-md transition">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 grid place-items-center text-amber-600 shrink-0"><Store size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-800 truncate">{a.dealer?.name || "ร้านใดก็ได้"}</div>
                      <div className="text-xs text-slate-500 truncate">{a.template?.name || "เช็คลิสต์"}{a.due_date && ` · ครบกำหนด ${a.due_date}`}</div>
                      {a.note && <div className="text-[11px] text-slate-400 truncate">{a.note}</div>}
                    </div>
                    <ChevronRight size={18} className="text-slate-300 shrink-0" />
                  </Link>
                ))}
              </Section>
            )}

            {/* ร่าง */}
            {drafts.length > 0 && (
              <Section title={`ร่างที่ยังไม่ส่ง (${drafts.length})`} icon={<FileText size={14} />}>
                {drafts.map(s => (
                  <Link key={s.id} href={`/app/store-checklist/new?draft=${s.id}`}
                    className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-dashed border-slate-300 hover:shadow-md transition">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center text-slate-500 shrink-0"><FileText size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-800 truncate">{s.dealer_name || s.dealer?.name || "—"}
                        <span className="ml-2 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full align-middle">ร่าง</span></div>
                      <div className="text-xs text-slate-500">{s.visit_date}{s.template?.name && ` · ${s.template.name}`}</div>
                    </div>
                    <span className="text-xs text-indigo-600 font-bold shrink-0">แก้ต่อ →</span>
                  </Link>
                ))}
              </Section>
            )}

            {/* บันทึกของฉัน */}
            <Section title={`บันทึกล่าสุดของฉัน (${done.length})`}>
              {done.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-400 shadow-sm border border-slate-100">ยังไม่มีบันทึก</div>
              ) : done.map(s => (
                <div key={s.id} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 grid place-items-center text-teal-600 shrink-0"><Store size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">{s.dealer_name || s.dealer?.name || "—"}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>{s.visit_date}</span>
                      {s.template?.name && <span>· {s.template.name}</span>}
                      {(s.photos?.length ?? 0) > 0 && <span className="flex items-center gap-0.5"><Camera size={11} /> {s.photos.length}</span>}
                      {s.lat != null && <MapPin size={11} className="text-emerald-500" />}
                    </div>
                  </div>
                </div>
              ))}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: any; children: any }) {
  return (
    <div>
      <h2 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">{icon}{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>}><Hub /></Suspense>
}
