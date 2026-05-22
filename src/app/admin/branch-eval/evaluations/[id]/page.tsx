"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Store, Calendar, User, MapPin, CheckCircle2, X,
  Trash2, Edit2, ExternalLink, Loader2, FileText, BadgeCheck,
  Camera, ClipboardCheck,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  draft:     { l: "ร่าง",     c: "bg-slate-100 text-slate-700" },
  submitted: { l: "รอรีวิว",  c: "bg-amber-100 text-amber-700" },
  reviewed:  { l: "รีวิวแล้ว", c: "bg-emerald-100 text-emerald-700" },
}

export default function AdminEvaluationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const d = await fetch(`/api/branch-eval/evaluations?id=${id}`).then(r => r.json())
    setData(d); setLoading(false)
  }
  useEffect(() => { if (id) load() }, [id])

  const softDelete = async () => {
    if (!confirm("ลบฟอร์มนี้? (soft delete — กู้คืนจากถังขยะได้)")) return
    const t = toast.loading("กำลังลบ...")
    const res = await fetch(`/api/branch-eval/evaluations?id=${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("ลบไม่สำเร็จ", { id: t }); return }
    toast.success("ลบแล้ว", { id: t })
    router.replace("/admin/branch-eval/evaluations")
  }

  if (loading) return (
    <div className="p-6 text-center"><Loader2 size={22} className="mx-auto animate-spin text-slate-300" /></div>
  )
  if (!data?.evaluation) return <div className="p-6 text-center text-slate-400">ไม่พบฟอร์ม</div>

  const ev = data.evaluation
  const items = data.items ?? []
  const answers: any[] = data.answers ?? []
  const photos: any[] = data.photos ?? []
  const answerById = new Map(answers.map((a: any) => [a.item_id, a]))
  const S = STATUS_LABEL[ev.status]
  const passed = items.filter((i: any) => answerById.get(i.id)?.is_pass === true).length
  const failed = items.filter((i: any) => answerById.get(i.id)?.is_pass === false).length

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-3 pb-32">
      <Link href="/admin/branch-eval/evaluations" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ฟอร์มทั้งหมด
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Store size={22} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400">{ev.template?.name}</p>
              <h1 className="text-xl font-black text-slate-800">{ev.branch?.name} <span className="text-[10px] font-bold text-slate-400">{ev.branch?.code}</span></h1>
              <p className="text-xs text-slate-500">
                <Calendar size={11} className="inline" /> {format(new Date(ev.visit_date), "EEEE d MMM yyyy", { locale: th })}
                {ev.visit_time && <> · {ev.visit_time.slice(0, 5)}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${S.c}`}>{S.l}</span>
            <Link href={`/app/branch-eval/${id}`}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
              <Edit2 size={12} /> เปิดในมุมมองผู้กรอก
            </Link>
            <button onClick={softDelete}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
              <Trash2 size={12} /> ลบ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
          <Stat label="คะแนนรวม" value={`${Number(ev.percentage).toFixed(1)}%`} sub={`${ev.total_score}/${ev.total_weight}`} color="indigo" />
          <Stat label="ผ่าน / ตก" value={`${passed} / ${failed}`} sub={`จาก ${items.length} ข้อ`} color="emerald" />
          <Stat label="เช็คอิน"
            value={ev.checkin_at ? format(new Date(ev.checkin_at), "HH:mm") : "—"}
            sub={ev.checkin_distance_m != null ? `ห่าง ${ev.checkin_distance_m} m` : "ไม่ได้เช็คอิน"}
            color={ev.checkin_at ? "sky" : "slate"} />
          <Stat label="รูปทั้งหมด" value={photos.length} sub="แนบในฟอร์ม" color="amber" />
        </div>

        {/* People */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
          <Info icon={<User size={11} />} label="ผู้ตรวจ"
            value={ev.evaluator ? `${ev.evaluator.first_name_th} ${ev.evaluator.last_name_th}${ev.evaluator.nickname ? ` (${ev.evaluator.nickname})` : ""}` : "—"} />
          <Info icon={<BadgeCheck size={11} />} label="ผู้รีวิว"
            value={ev.reviewer ? `${ev.reviewer.first_name_th} ${ev.reviewer.last_name_th}` : "—"}
            sub={ev.reviewed_at ? format(new Date(ev.reviewed_at), "d MMM yyyy HH:mm", { locale: th }) : undefined} />
          <Info icon={<Store size={11} />} label="Store Manager" value={ev.store_manager || "—"} />
          <Info icon={<User size={11} />} label="Sales Staff" value={ev.store_staff || "—"} />
        </div>

        {(ev.general_notes || ev.action_plan || ev.reviewer_notes) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            {ev.general_notes && <NotePanel title="หมายเหตุทั่วไป" body={ev.general_notes} color="slate" />}
            {ev.action_plan && <NotePanel title="Action Plan" body={ev.action_plan} color="amber" />}
            {ev.reviewer_notes && <NotePanel title="Reviewer Notes" body={ev.reviewer_notes} color="emerald" />}
          </div>
        )}
      </div>

      {/* Item-by-item breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
        <p className="text-sm font-black text-slate-800 px-1 mb-2 flex items-center gap-1.5">
          <ClipboardCheck size={13} className="text-indigo-500" />
          ผลตรวจรายข้อ ({items.length} ข้อ)
        </p>
        <div className="space-y-1.5">
          {items.map((it: any) => {
            const a = answerById.get(it.id)
            const ok = a?.is_pass
            return (
              <div key={it.id} className={`border rounded-lg p-2.5 ${
                ok === true ? "bg-emerald-50/50 border-emerald-200"
                : ok === false ? "bg-rose-50/50 border-rose-200"
                : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
                    ok === true ? "bg-emerald-500 text-white"
                    : ok === false ? "bg-rose-500 text-white"
                    : "bg-slate-300 text-slate-700"
                  }`}>{it.code}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{it.question_th}</p>
                    {a?.note && <p className="text-[11px] text-slate-600 italic mt-0.5">💬 {a.note}</p>}
                    {(a?.photo_urls?.length > 0) && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {a.photo_urls.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded overflow-hidden border border-slate-200">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      ok === true ? "bg-emerald-500 text-white"
                      : ok === false ? "bg-rose-500 text-white"
                      : "bg-slate-200 text-slate-600"
                    }`}>
                      {ok === true ? "✓" : ok === false ? "✗" : "—"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">{a?.earned_weight ?? 0}/{it.weight}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, color }: any) {
  const palette: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    sky: "bg-sky-50 border-sky-100 text-sky-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    slate: "bg-slate-50 border-slate-100 text-slate-700",
  }
  return (
    <div className={`${palette[color]} rounded-xl border p-2.5`}>
      <p className="text-[10px] font-bold uppercase opacity-80">{label}</p>
      <p className="text-lg font-black leading-tight">{value}</p>
      {sub && <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

function Info({ icon, label, value, sub }: any) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 inline-flex items-center gap-1">{icon} {label}</p>
      <p className="text-xs font-bold text-slate-800 mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  )
}

function NotePanel({ title, body, color }: any) {
  const palette: Record<string, string> = {
    slate: "bg-slate-50 border-slate-200 text-slate-700",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  }
  return (
    <div className={`${palette[color]} border rounded-lg p-2.5`}>
      <p className="text-[10px] font-black uppercase opacity-80 mb-1">{title}</p>
      <p className="text-xs whitespace-pre-wrap leading-relaxed">{body}</p>
    </div>
  )
}
