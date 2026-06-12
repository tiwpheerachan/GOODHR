"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Store, Calendar, User, MapPin, CheckCircle2, X,
  Trash2, Edit2, ExternalLink, Loader2, FileText, BadgeCheck,
  Camera, ClipboardCheck, Sparkles, FileSpreadsheet,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import PhotoLightbox from "@/components/PhotoLightbox"
import * as XLSX from "xlsx"

const STATUS_LABEL: Record<string, { l: string; c: string }> = {
  draft:     { l: "ร่าง",      c: "bg-slate-100 text-slate-700" },
  submitted: { l: "รออนุมัติ", c: "bg-amber-100 text-amber-700" },
  reviewed:  { l: "รีวิวแล้ว", c: "bg-sky-100 text-sky-700" },
  approved:  { l: "✓ อนุมัติ",  c: "bg-emerald-100 text-emerald-700" },
  rejected:  { l: "✗ ปฏิเสธ",   c: "bg-rose-100 text-rose-700" },
}

export default function AdminEvaluationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiStats, setAiStats] = useState<any | null>(null)
  const [aiCharts, setAiCharts] = useState<any | null>(null)
  const [exporting, setExporting] = useState(false)
  const [reviewerNotes, setReviewerNotes] = useState("")
  const [approvalActing, setApprovalActing] = useState<"approve" | "reject" | null>(null)
  // ── Photo lightbox ──
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number; caption?: string } | null>(null)
  const openLightbox = (urls: string[], index: number, caption?: string) => setLightbox({ urls, index, caption })

  // ── Approve/Reject ──
  const submitApproval = async (action: "approve" | "reject") => {
    if (!data?.evaluation) return
    setApprovalActing(action)
    try {
      const res = await fetch("/api/branch-eval/evaluations", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, reviewer_notes: reviewerNotes || null }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ไม่สำเร็จ"); return }
      toast.success(action === "approve" ? "อนุมัติเรียบร้อย ✓" : "ปฏิเสธเรียบร้อย")
      setReviewerNotes("")
      await load()
    } finally { setApprovalActing(null) }
  }

  const load = async () => {
    setLoading(true)
    const d = await fetch(`/api/branch-eval/evaluations?id=${id}`).then(r => r.json())
    setData(d); setLoading(false)
  }
  useEffect(() => { if (id) load() }, [id])

  const askAI = async () => {
    setAiOpen(true); setAiLoading(true); setAiSummary(null); setAiStats(null); setAiCharts(null)
    try {
      const res = await fetch("/api/branch-eval/ai-summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluation_id: id }),
      })
      const d = await res.json()
      if (!res.ok) { setAiSummary(d.error || "AI วิเคราะห์ไม่สำเร็จ"); return }
      setAiSummary(d.summary || "—")
      setAiStats(d.stats ?? null)
      setAiCharts(d.charts ?? null)
    } catch (e: any) {
      setAiSummary(e?.message || "Network error")
    } finally { setAiLoading(false) }
  }

  const downloadXlsx = () => {
    if (!data?.evaluation) return
    setExporting(true)
    try {
      const ev = data.evaluation
      const items: any[] = data.items ?? []
      const ansArr: any[] = data.answers ?? []
      const ansMap = new Map(ansArr.map((a: any) => [a.item_id, a]))
      const wb = XLSX.utils.book_new()

      // Sheet 1: Header
      const header: any[][] = [
        ["ฟอร์มประเมินสาขา"],
        [""],
        ["สาขา", ev.branch?.name ?? ""],
        ["รหัสสาขา", ev.branch?.code ?? ""],
        ["เทมเพลต", ev.template?.name ?? ""],
        ["วันที่ตรวจ", ev.visit_date],
        ["เวลา", ev.visit_time ?? ""],
        ["ผู้ตรวจ", ev.evaluator ? `${ev.evaluator.first_name_th} ${ev.evaluator.last_name_th}` : ""],
        ["รหัสพนักงาน", ev.evaluator?.employee_code ?? ""],
        ["สถานะ", ev.status],
        [""],
        ["คะแนนรวม (%)", Number(Number(ev.percentage).toFixed(2))],
        ["คะแนนได้", Number(ev.total_score)],
        ["คะแนนเต็ม", Number(ev.total_weight)],
        ["เกรด", ev.percentage >= 90 ? "A" : ev.percentage >= 75 ? "B" : ev.percentage >= 60 ? "C" : "D"],
        [""],
        ["Check-in เวลา", ev.checkin_at ? format(new Date(ev.checkin_at), "yyyy-MM-dd HH:mm") : "ไม่ได้เช็คอิน"],
        ["ห่างจากสาขา (m)", ev.checkin_distance_m ?? ""],
        [""],
        ["หมายเหตุทั่วไป", ev.general_notes ?? ""],
        ["Action Plan", ev.action_plan ?? ""],
        ["Reviewer Notes", ev.reviewer_notes ?? ""],
      ]
      const wsHead = XLSX.utils.aoa_to_sheet(header)
      wsHead["!cols"] = [{ wch: 24 }, { wch: 60 }]
      XLSX.utils.book_append_sheet(wb, wsHead, "ข้อมูลฟอร์ม")

      // Sheet 2: Items + Answers
      const rows = items.filter((it: any) => !it.is_section).map((it: any) => {
        const a: any = ansMap.get(it.id)
        const val = a?.answer_value
        const valDisplay = val?.yes === true ? "YES"
          : val?.yes === false ? "NO"
          : val?.score != null ? String(val.score)
          : val?.text ?? val?.value ?? ""
        return {
          "ข้อ": it.code,
          "คำถาม": it.question_th,
          "EN": it.question_en ?? "",
          "น้ำหนัก": Number(it.weight) || 0,
          "ประเภท": it.answer_type === "yes_no" ? "✓/✗" : it.answer_type === "score_1_5" ? "1-5" : it.answer_type,
          "คำตอบ": valDisplay,
          "ผ่าน/ตก": a?.is_pass === true ? "PASS" : a?.is_pass === false ? "FAIL" : "ไม่ตอบ",
          "ได้คะแนน": Number(a?.earned_weight) || 0,
          "หมายเหตุผู้ตรวจ": a?.note ?? "",
          "จำนวนรูป": Array.isArray(a?.photo_urls) ? a.photo_urls.length : 0,
        }
      })
      const wsRows = XLSX.utils.json_to_sheet(rows)
      wsRows["!cols"] = [
        { wch: 6 }, { wch: 50 }, { wch: 35 }, { wch: 8 }, { wch: 8 },
        { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 40 }, { wch: 8 },
      ]
      XLSX.utils.book_append_sheet(wb, wsRows, "รายข้อ")

      const safeName = (ev.branch?.name ?? "branch").replace(/[^\w฀-๿]+/g, "_")
      const filename = `form_${safeName}_${ev.visit_date}.xlsx`
      XLSX.writeFile(wb, filename)
      toast.success(`ดาวน์โหลด ${filename}`)
    } catch (e: any) {
      toast.error(e?.message || "Export ไม่สำเร็จ")
    } finally { setExporting(false) }
  }

  const softDelete = async () => {
    if (!confirm("ลบฟอร์มนี้? (soft delete — กู้คืนจากถังขยะได้)")) return
    const t = toast.loading("กำลังลบ...")
    const res = await fetch(`/api/branch-eval/evaluations?id=${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("ลบไม่สำเร็จ", { id: t }); return }
    toast.success("ลบแล้ว", { id: t })
    router.replace("/app/branch-eval/manage/evaluations")
  }

  if (loading) return (
    <div className="p-6 text-center"><Loader2 size={22} className="mx-auto animate-spin text-slate-300" /></div>
  )
  if (!data?.evaluation) return <div className="p-6 text-center text-slate-400">ไม่พบฟอร์ม</div>

  const ev = data.evaluation
  const items = data.items ?? []
  const realItems = items.filter((i: any) => !i.is_section)
  const answers: any[] = data.answers ?? []
  const photos: any[] = data.photos ?? []
  const answerById = new Map(answers.map((a: any) => [a.item_id, a]))
  const S = STATUS_LABEL[ev.status]
  const passed = realItems.filter((i: any) => answerById.get(i.id)?.is_pass === true).length
  const failed = realItems.filter((i: any) => answerById.get(i.id)?.is_pass === false).length

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-3 pb-32">
      <Link href="/app/branch-eval/manage/evaluations" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
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
            <button onClick={askAI}
              className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
              <Sparkles size={12} /> AI วิเคราะห์
            </button>
            <button onClick={downloadXlsx} disabled={exporting}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-40">
              {exporting ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={12} />}
              ดาวน์โหลด Excel
            </button>
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
          <Stat label="ผ่าน / ตก" value={`${passed} / ${failed}`} sub={`จาก ${realItems.length} ข้อ`} color="emerald" />
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
            {ev.reviewer_notes && (
              <NotePanel
                title={ev.status === "rejected" ? "เหตุผลปฏิเสธ" : ev.status === "approved" ? "ความเห็นจากผู้อนุมัติ" : "Reviewer Notes"}
                body={ev.reviewer_notes}
                color={ev.status === "rejected" ? "rose" : "emerald"}
              />
            )}
          </div>
        )}
      </div>

      {/* ─── Approval panel — เห็นเฉพาะคนที่อนุมัติได้ + ฟอร์มอยู่ในสถานะ submitted ─── */}
      {data?.access?.can_approve && ev.status === "submitted" && (
        <div className="bg-gradient-to-br from-amber-50 via-white to-emerald-50 rounded-2xl border-2 border-amber-200 p-4 lg:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
              <BadgeCheck size={16} className="text-white"/>
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">รออนุมัติ</p>
              <p className="text-[11px] text-slate-500">
                กดอนุมัติหรือปฏิเสธฟอร์มนี้ — ความเห็นจะถูกส่งไปยัง{ev.evaluator ? ` ${ev.evaluator.first_name_th}` : "ผู้กรอก"}
              </p>
            </div>
          </div>
          <textarea value={reviewerNotes} onChange={e => setReviewerNotes(e.target.value)}
            rows={3} placeholder="ความเห็น / Feedback (ไม่บังคับ) — เช่น 'จุดที่ควรปรับปรุง', 'ส่วนที่ทำได้ดี', เหตุผลที่ปฏิเสธ..."
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 resize-none"/>
          <div className="flex gap-2 mt-3">
            <button onClick={() => submitApproval("reject")} disabled={approvalActing !== null}
              className="flex-1 py-2.5 bg-white hover:bg-rose-50 border-2 border-rose-200 text-rose-700 text-sm font-black rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40 transition">
              {approvalActing === "reject" ? <Loader2 size={14} className="animate-spin"/> : "✗"}
              ปฏิเสธ
            </button>
            <button onClick={() => submitApproval("approve")} disabled={approvalActing !== null}
              className="flex-[2] py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-black rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-sm transition">
              {approvalActing === "approve" ? <Loader2 size={14} className="animate-spin"/> : <BadgeCheck size={14}/>}
              อนุมัติ
            </button>
          </div>
        </div>
      )}

      {/* ─── เมื่อ approved/rejected แล้ว — แสดงผล + ปุ่ม "เปลี่ยนสถานะ" ──── */}
      {data?.access?.can_approve && (ev.status === "approved" || ev.status === "rejected") && (
        <div className={"rounded-2xl border-2 p-4 shadow-sm " + (ev.status === "approved"
          ? "bg-emerald-50 border-emerald-200"
          : "bg-rose-50 border-rose-200")}>
          <div className="flex items-start gap-3">
            <div className={"w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 " +
              (ev.status === "approved" ? "bg-emerald-500" : "bg-rose-500")}>
              <BadgeCheck size={16} className="text-white"/>
            </div>
            <div className="flex-1">
              <p className={"font-black text-sm " + (ev.status === "approved" ? "text-emerald-800" : "text-rose-800")}>
                {ev.status === "approved" ? "ฟอร์มนี้ได้รับอนุมัติแล้ว ✓" : "ฟอร์มนี้ถูกปฏิเสธ ✗"}
              </p>
              <p className="text-[11px] text-slate-500">
                โดย {ev.reviewer ? `${ev.reviewer.first_name_th} ${ev.reviewer.last_name_th}` : "—"}
                {ev.reviewed_at && ` · ${format(new Date(ev.reviewed_at), "d MMM yyyy HH:mm", { locale: th })}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Item-by-item breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
        <p className="text-sm font-black text-slate-800 px-1 mb-2 flex items-center gap-1.5">
          <ClipboardCheck size={13} className="text-indigo-500" />
          ผลตรวจรายข้อ ({items.filter((i: any) => !i.is_section).length} ข้อ)
        </p>
        <div className="space-y-1.5">
          {items.map((it: any) => {
            if (it.is_section) {
              return (
                <div key={it.id} className="bg-gradient-to-r from-violet-500 to-indigo-500 rounded-lg p-2.5 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">หัวข้อหลัก</p>
                  <p className="text-sm font-black">{it.question_th}</p>
                  {it.question_en && <p className="text-[10px] opacity-80">{it.question_en}</p>}
                </div>
              )
            }
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
                    <p className="text-sm font-bold text-slate-800">
                      {it.question_th}
                      {it.requires_photo && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          <Camera size={8}/> บังคับรูป
                        </span>
                      )}
                    </p>
                    {a?.note && <p className="text-[11px] text-slate-600 italic mt-0.5">💬 {a.note}</p>}
                    {(a?.photo_urls?.length > 0) && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {a.photo_urls.map((url: string, i: number) => (
                          <button key={i} type="button"
                            onClick={() => openLightbox(a.photo_urls, i, `ข้อ ${it.code}: ${it.question_th}`)}
                            className="w-10 h-10 rounded overflow-hidden border border-slate-200 cursor-zoom-in hover:border-indigo-400 transition-colors">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
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

      {/* AI Summary Modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setAiOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden mt-4 sm:mt-0" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <div>
                  <h3 className="font-black">AI วิเคราะห์ฟอร์มนี้</h3>
                  <p className="text-[10px] opacity-90">{ev.branch?.name} · {ev.visit_date}</p>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {aiLoading ? (
                <div className="py-16 text-center">
                  <Loader2 size={28} className="mx-auto animate-spin text-violet-400 mb-2" />
                  <p className="text-xs text-slate-500">กำลังวิเคราะห์... ขอเวลา 5-15 วินาที</p>
                </div>
              ) : (
                <>
                  {aiStats && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-indigo-50 rounded-lg p-2 border border-white">
                        <p className="text-[10px] font-bold uppercase opacity-80 text-indigo-700">คะแนน</p>
                        <p className="text-lg font-black text-indigo-700 leading-tight">{aiStats.avg?.toFixed(1)}%</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-2 border border-white">
                        <p className="text-[10px] font-bold uppercase opacity-80 text-emerald-700">ผ่าน</p>
                        <p className="text-lg font-black text-emerald-700 leading-tight">{aiStats.passed}/{aiStats.total_items}</p>
                      </div>
                      <div className="bg-rose-50 rounded-lg p-2 border border-white">
                        <p className="text-[10px] font-bold uppercase opacity-80 text-rose-700">ตก</p>
                        <p className="text-lg font-black text-rose-700 leading-tight">{aiStats.failed}/{aiStats.total_items}</p>
                      </div>
                    </div>
                  )}

                  {aiSummary && (
                    <div className="bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                      <div className="text-sm text-slate-700 leading-loose whitespace-pre-wrap font-sans"
                        style={{ lineHeight: 1.85 }}>
                        {aiSummary.replace(/\*\*/g, "").replace(/__/g, "").replace(/^#+\s*/gm, "")}
                      </div>
                    </div>
                  )}

                  {aiCharts?.top_fail_items?.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                      <p className="text-sm font-black text-slate-800 mb-3">ข้อที่ตกในฟอร์มนี้</p>
                      <div className="space-y-1.5">
                        {aiCharts.top_fail_items.map((d: any, i: number) => {
                          const max = Math.max(...aiCharts.top_fail_items.map((x: any) => x.value), 1)
                          const pct = (d.value / max) * 100
                          return (
                            <div key={i}>
                              <div className="flex items-center gap-2 text-[11px] mb-0.5">
                                <span className="text-slate-700 font-bold truncate flex-1" title={d.full_label}>{d.label}</span>
                                <span className="text-rose-600 font-bold">{d.value}p</span>
                                <span className="text-slate-400 text-[10px]">{d.sub}</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full"
                                  style={{ width: `${Math.max(2, pct)}%` }} />
                              </div>
                              <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{d.full_label}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <p className="text-[10px] text-slate-400">
                <Sparkles size={9} className="inline" /> พัฒนาโดยทีม SHD Technology · AI อาจมี error ตรวจสอบเสมอ
              </p>
              <button onClick={() => setAiOpen(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo lightbox ── */}
      {lightbox && (
        <PhotoLightbox
          urls={lightbox.urls}
          startIndex={lightbox.index}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      )}
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
