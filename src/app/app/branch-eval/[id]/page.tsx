"use client"
import { useEffect, useMemo, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, MapPin, Camera, Loader2, Check, X, ImageIcon,
  Save, Send, ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  Trash2, Store, Calendar, Clock, User, FileText, MessageSquare,
  ClipboardCheck, BadgeCheck, Eye,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Item = {
  id: string; order_no: number; code: string
  question_th: string; question_en?: string
  sub_notes: string[]
  weight: number
  answer_type: "yes_no" | "score_1_5" | "text" | "number"
  requires_note: boolean; requires_photo: boolean
  is_section?: boolean
}
type Answer = {
  evaluation_id: string; item_id: string
  answer_value: any; is_pass: boolean | null
  earned_weight: number
  note?: string
  photo_urls: string[]
}

export default function BranchEvalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<{ itemId: string | null; kind: "checkin" | "answer" } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [headerEdit, setHeaderEdit] = useState({ general_notes: "", action_plan: "", visit_date: "", visit_time: "", target_manager_id: "" as string, evaluatee_id: "" as string })
  const [savingHeader, setSavingHeader] = useState(false)
  const [reviewerNotes, setReviewerNotes] = useState("")
  // ── ผู้รับฟอร์ม (target manager) — pick จากพนักงานทั้งบริษัท ──
  const [mgrOptions, setMgrOptions] = useState<any[]>([])
  const [mgrSearch, setMgrSearch] = useState("")
  const [showMgrPicker, setShowMgrPicker] = useState(false)
  const [evalteeSearch, setEvalteeSearch] = useState("")
  const [showEvalteePicker, setShowEvalteePicker] = useState(false)

  // เริ่มต้น: skeleton loading ครั้งแรก
  // หลังจากนั้น: silent refresh (ไม่ตั้ง loading=true → ไม่กระตุก/flash)
  const load = async (silent: boolean = false) => {
    if (!silent) setLoading(true)
    const d = await fetch(`/api/branch-eval/evaluations?id=${id}`).then(r => r.json())
    setData(d)
    if (d.evaluation) {
      setHeaderEdit({
        general_notes: d.evaluation.general_notes ?? "",
        action_plan: d.evaluation.action_plan ?? "",
        visit_date: d.evaluation.visit_date ?? "",
        visit_time: d.evaluation.visit_time ?? "",
        target_manager_id: d.evaluation.target_manager_id ?? "",
        evaluatee_id: d.evaluation.evaluatee_id ?? "",
      })
      setReviewerNotes(d.evaluation.reviewer_notes ?? "")
    }
    setLoading(false)
  }
  useEffect(() => { if (id) load() }, [id])

  // ── server-side search (debounced) ──
  // ใช้ร่วมกันทั้ง 2 picker: ส่ง q ที่ active อยู่ → ค้นใน DB เลย
  const activeSearch = showMgrPicker ? mgrSearch : showEvalteePicker ? evalteeSearch : ""
  useEffect(() => {
    if (!showMgrPicker && !showEvalteePicker) return
    const t = setTimeout(() => {
      const params = new URLSearchParams({
        q: activeSearch.trim(),
        limit: "50",
        all_companies: "1",
      })
      fetch(`/api/employees/search?${params}`)
        .then(r => r.json())
        .then(d => setMgrOptions(d.employees ?? []))
        .catch(() => setMgrOptions([]))
    }, activeSearch ? 250 : 0)
    return () => clearTimeout(t)
  }, [showMgrPicker, showEvalteePicker, activeSearch])

  if (loading) return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="h-20 bg-slate-100 rounded-2xl animate-pulse mb-3" />
      <div className="space-y-2">
        {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )
  if (!data?.evaluation) return (
    <div className="p-6 text-center text-slate-400">ไม่พบฟอร์ม</div>
  )

  const ev = data.evaluation
  const items: Item[] = data.items ?? []
  const answersList: Answer[] = data.answers ?? []
  const access = data.access ?? { can_edit: false, can_review: false, is_owner: false }
  const answerById = new Map<string, Answer>(answersList.map(a => [a.item_id, a]))

  // ── Save answer (Optimistic update — ไม่กระตุก) ──
  //   1. update local state ทันที (user เห็นผลทันที)
  //   2. ยิง API พื้นหลัง
  //   3. ถ้า error → rollback + reload (เคสน้อย)
  //   4. ถ้าสำเร็จ → silent refresh (ดึง earned_weight ใหม่ ไม่กระตุก)
  const saveAnswer = async (itemId: string, payload: Partial<Answer>) => {
    setBusy(itemId)
    const cur = answerById.get(itemId)
    const body = {
      evaluation_id: id,
      item_id: itemId,
      answer_value: payload.answer_value ?? cur?.answer_value ?? null,
      note: payload.note ?? cur?.note ?? null,
      photo_urls: payload.photo_urls ?? cur?.photo_urls ?? [],
    }

    // ── Optimistic update — แสดงผลในจอทันที ──
    setData((prev: any) => {
      if (!prev) return prev
      const newAnswers = [...(prev.answers ?? [])]
      const idx = newAnswers.findIndex((a: any) => a.item_id === itemId)
      const updated = {
        ...(idx >= 0 ? newAnswers[idx] : { item_id: itemId, evaluation_id: id }),
        answer_value: body.answer_value,
        note: body.note,
        photo_urls: body.photo_urls,
      }
      if (idx >= 0) newAnswers[idx] = updated
      else newAnswers.push(updated)
      return { ...prev, answers: newAnswers }
    })

    try {
      const res = await fetch("/api/branch-eval/answers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || "บันทึกไม่สำเร็จ")
        await load(true)  // rollback: silent refresh
      } else {
        // silent refresh — ดึง earned_weight ใหม่ (ไม่ flash skeleton)
        await load(true)
      }
    } finally { setBusy(null) }
  }

  // ── Save header fields ──
  const saveHeader = async () => {
    setSavingHeader(true)
    const t = toast.loading("กำลังบันทึก...")
    try {
      const res = await fetch("/api/branch-eval/evaluations", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...headerEdit }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "บันทึกไม่สำเร็จ", { id: t }); return }
      toast.success("บันทึกแล้ว", { id: t })
      await load(true)  // silent — ไม่กระตุก
    } finally { setSavingHeader(false) }
  }

  // ── Auto-save target_manager_id ทันทีที่เลือก/ลบ — ไม่ต้องกดปุ่ม "บันทึก" ──
  const saveTargetManager = async (newId: string | null) => {
    setHeaderEdit(h => ({ ...h, target_manager_id: newId || "" }))
    try {
      const res = await fetch("/api/branch-eval/evaluations", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, target_manager_id: newId }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "บันทึกไม่สำเร็จ"); return }
      // Optimistic: update data.evaluation.target_manager + target_manager_id ทันที
      const picked = newId ? mgrOptions.find(e => e.id === newId) : null
      setData((prev: any) => prev ? ({
        ...prev,
        evaluation: {
          ...prev.evaluation,
          target_manager_id: newId,
          target_manager: picked || null,
        },
      }) : prev)
      // silent refresh — ดึง target_manager (รวม nickname, employee_code) ใหม่
      await load(true)
      toast.success(newId ? "บันทึกผู้รับฟอร์มแล้ว" : "ลบผู้รับฟอร์มแล้ว")
    } catch { toast.error("บันทึกไม่สำเร็จ") }
  }

  // ── Auto-save evaluatee_id (ผู้ถูกประเมิน) ──
  const saveEvaluatee = async (newId: string | null) => {
    setHeaderEdit(h => ({ ...h, evaluatee_id: newId || "" }))
    try {
      const res = await fetch("/api/branch-eval/evaluations", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, evaluatee_id: newId }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "บันทึกไม่สำเร็จ"); return }
      const picked = newId ? mgrOptions.find(e => e.id === newId) : null
      setData((prev: any) => prev ? ({
        ...prev,
        evaluation: {
          ...prev.evaluation,
          evaluatee_id: newId,
          evaluatee: picked || null,
        },
      }) : prev)
      await load(true)
      toast.success(newId ? "บันทึกผู้ถูกประเมินแล้ว" : "ลบผู้ถูกประเมินแล้ว")
    } catch { toast.error("บันทึกไม่สำเร็จ") }
  }

  // ── Check-in (GPS + optional photo) ──
  const doCheckin = async (withPhoto: boolean) => {
    if (!navigator.geolocation) { toast.error("เบราเซอร์ไม่รองรับ GPS"); return }
    setGpsLoading(true)
    const t = toast.loading("กำลังหาตำแหน่ง...")
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 }))
      const { latitude, longitude } = pos.coords

      let photoUrl: string | null = null
      if (withPhoto) {
        toast.loading("รอถ่ายรูป...", { id: t })
        const file = await pickFile()
        if (file) {
          const fd = new FormData()
          fd.append("file", file)
          fd.append("evaluation_id", id as string)
          fd.append("kind", "checkin")
          const up = await fetch("/api/branch-eval/upload", { method: "POST", body: fd }).then(r => r.json())
          photoUrl = up.url || null
        }
      }

      const res = await fetch("/api/branch-eval/checkin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluation_id: id, lat: latitude, lng: longitude, photo_url: photoUrl }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "เช็คอินไม่สำเร็จ", { id: t }); return }
      toast.success(
        d.distance_m != null
          ? `เช็คอินแล้ว · ห่างจากสาขา ${d.distance_m} m`
          : "เช็คอินแล้ว",
        { id: t },
      )
      await load(true)  // silent
    } catch (e: any) {
      toast.error(e?.message || "เช็คอินไม่สำเร็จ", { id: t })
    } finally { setGpsLoading(false) }
  }

  // ── Upload photo for answer ──
  const uploadPhotoForItem = async (itemId: string) => {
    const file = await pickFile()
    if (!file) return
    setBusy(itemId)
    const t = toast.loading("กำลังอัปโหลด...")
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("evaluation_id", id as string)
      fd.append("kind", "answer")
      const up = await fetch("/api/branch-eval/upload", { method: "POST", body: fd }).then(r => r.json())
      if (!up.url) { toast.error(up.error || "อัปโหลดไม่สำเร็จ", { id: t }); return }
      const cur = answerById.get(itemId)
      const photos = [...(cur?.photo_urls ?? []), up.url]
      await saveAnswer(itemId, { photo_urls: photos })
      toast.success("อัปโหลดแล้ว", { id: t })
    } finally { setBusy(null) }
  }

  // ── Submit evaluation ──
  const submit = async () => {
    if (!confirm("ส่งฟอร์มเลย? (แก้ไขเพิ่มเติมได้หลังส่ง)")) return
    const t = toast.loading("กำลังส่ง...")
    const res = await fetch("/api/branch-eval/evaluations", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "submit" }),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error, { id: t }); return }
    toast.success("ส่งแล้ว", { id: t })
    await load(true)  // silent
  }

  // ── Review (supervisor) ──
  const doReview = async () => {
    const t = toast.loading("กำลังบันทึก review...")
    const res = await fetch("/api/branch-eval/evaluations", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "review", reviewer_notes: reviewerNotes }),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error, { id: t }); return }
    toast.success("รีวิวแล้ว", { id: t })
    await load(true)  // silent
  }

  // ⚠️ skip sections ตอนนับ progress + pass/fail
  const realItems = items.filter(i => !i.is_section)
  const answered = realItems.filter(i => answerById.has(i.id)).length
  const passed = realItems.filter(i => answerById.get(i.id)?.is_pass === true).length
  const progressPct = realItems.length > 0 ? Math.round((answered / realItems.length) * 100) : 0

  const STATUS_LABEL: Record<string, string> = {
    draft: "ร่าง", submitted: "ส่งแล้ว", reviewed: "รีวิวแล้ว",
    approved: "✓ อนุมัติ", rejected: "✗ ปฏิเสธ",
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-3 pb-32">
      <Link href="/app/branch-eval" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> รายการประเมิน
      </Link>

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Store size={22} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400">{ev.template?.name}</p>
              <h1 className="text-xl font-black text-slate-800">{ev.branch?.name}</h1>
              <p className="text-xs text-slate-500">
                <Calendar size={11} className="inline" /> {format(new Date(ev.visit_date), "EEEE d MMM yyyy", { locale: th })}
                {ev.evaluator && <> · <User size={11} className="inline" /> {ev.evaluator.first_name_th} {ev.evaluator.last_name_th}</>}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
            ev.status === "draft" ? "bg-slate-100 text-slate-700"
            : ev.status === "submitted" ? "bg-sky-100 text-sky-700"
            : "bg-emerald-100 text-emerald-700"
          }`}>
            {STATUS_LABEL[ev.status]}
          </span>
        </div>

        {/* progress + score */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase">กรอกแล้ว</p>
            <p className="text-lg font-black text-slate-800">{answered} / {realItems.length}</p>
            <div className="h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-700 uppercase">ผ่านเกณฑ์</p>
            <p className="text-lg font-black text-emerald-800">{passed} / {answered || 0}</p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-2.5 border border-indigo-100">
            <p className="text-[10px] font-bold text-indigo-700 uppercase">คะแนน</p>
            <p className="text-lg font-black text-indigo-800">
              {Number(ev.percentage).toFixed(1)}%
              <span className="text-[10px] text-indigo-500 ml-1 font-normal">({ev.total_score}/{ev.total_weight})</span>
            </p>
          </div>
        </div>

        {/* ── check-in widget ── */}
        <div className="mt-3 p-3 bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-100 rounded-xl">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-sky-600" />
              <p className="text-xs font-black text-slate-800">เช็คอินที่สาขา (ทางเลือก)</p>
            </div>
            {ev.checkin_at ? (
              <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center gap-1">
                <CheckCircle2 size={11} /> เช็คอินแล้ว {format(new Date(ev.checkin_at), "HH:mm")}
                {ev.checkin_distance_m != null && <> · ห่าง {ev.checkin_distance_m} m</>}
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">ยังไม่ได้เช็คอิน</span>
            )}
          </div>
          {access.can_edit && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button onClick={() => doCheckin(false)} disabled={gpsLoading}
                className="text-[11px] px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold inline-flex items-center gap-1 disabled:opacity-50">
                {gpsLoading ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                เช็คอิน GPS
              </button>
              <button onClick={() => doCheckin(true)} disabled={gpsLoading}
                className="text-[11px] px-2.5 py-1 bg-white border border-sky-300 hover:bg-sky-50 text-sky-700 rounded-lg font-bold inline-flex items-center gap-1 disabled:opacity-50">
                <Camera size={11} /> GPS + รูป
              </button>
              {ev.checkin_photo_url && (
                <a href={ev.checkin_photo_url} target="_blank" rel="noreferrer"
                  className="text-[11px] px-2.5 py-1 bg-white border border-emerald-300 text-emerald-700 rounded-lg font-bold inline-flex items-center gap-1">
                  <Eye size={11} /> ดูรูปเช็คอิน
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Header fields (editable) ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-slate-500" />
          <p className="text-sm font-black text-slate-800">ข้อมูลการตรวจ</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="วันที่ตรวจ" type="date" value={headerEdit.visit_date} disabled={!access.can_edit}
            onChange={(v: string) => setHeaderEdit(h => ({ ...h, visit_date: v }))} />
          <Field label="เวลา" type="time" value={headerEdit.visit_time} disabled={!access.can_edit}
            onChange={(v: string) => setHeaderEdit(h => ({ ...h, visit_time: v }))} />
        </div>

        {/* ── ส่งฟอร์มถึงใคร (optional tag) ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">📩 ส่งฟอร์มถึง (หัวหน้า/ผู้รับรายงาน)</p>
          {(() => {
            const tm = (ev as any).target_manager
            const picked = mgrOptions.find(e => e.id === headerEdit.target_manager_id)
            const display = picked || tm
            if (display) {
              return (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center text-[11px] font-black text-emerald-700 flex-shrink-0">
                    {display.first_name_th?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-emerald-800 truncate">
                      {display.first_name_th} {display.last_name_th}
                      {display.nickname && <span className="text-emerald-500 ml-1">({display.nickname})</span>}
                    </p>
                    <p className="text-[9px] text-emerald-500">{display.employee_code}</p>
                  </div>
                  {access.can_edit && (
                    <>
                      <button onClick={() => setShowMgrPicker(true)}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 underline">
                        เปลี่ยน
                      </button>
                      <button onClick={() => saveTargetManager(null)}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700 underline">
                        ลบ
                      </button>
                    </>
                  )}
                </div>
              )
            }
            return access.can_edit ? (
              <button onClick={() => setShowMgrPicker(true)}
                className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 text-left">
                + เลือกหัวหน้า/ผู้รับรายงาน <span className="text-[9px] text-slate-400">(ไม่บังคับ — เพื่อจัดหมวดหมู่ + แจ้งเตือนเฉพาะเจาะจง)</span>
              </button>
            ) : (
              <p className="text-xs text-slate-400">— ไม่ระบุ —</p>
            )
          })()}

          {/* Manager picker dropdown */}
          {showMgrPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMgrPicker(false)} />
              <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-w-md w-full max-h-[280px] overflow-hidden flex flex-col">
                <input value={mgrSearch} onChange={e => setMgrSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ / รหัส / ชื่อเล่น..." autoFocus
                  className="bg-slate-50 px-3 py-2 text-xs outline-none border-b border-slate-200" />
                <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                  {mgrOptions.length === 0
                    ? <p className="text-center py-3 text-xs text-slate-400">{mgrSearch.trim() ? "ไม่พบ" : "กำลังโหลด..."}</p>
                    : mgrOptions.map(e => (
                      <button key={e.id}
                        onClick={() => {
                          saveTargetManager(e.id)
                          setShowMgrPicker(false)
                          setMgrSearch("")
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                          {e.first_name_th?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">
                            {e.first_name_th} {e.last_name_th}
                            {e.nickname && <span className="text-slate-400 ml-1">({e.nickname})</span>}
                          </p>
                          <p className="text-[9px] text-slate-400">{e.employee_code} · {e.department?.name || ""}</p>
                        </div>
                      </button>
                    ))
                  }
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── ประเมินใคร (optional tag) ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">👤 ประเมินใคร (ผู้ถูกประเมิน)</p>
          {(() => {
            const ee = (ev as any).evaluatee
            const picked = mgrOptions.find(e => e.id === headerEdit.evaluatee_id)
            const display = picked || ee
            if (display) {
              return (
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-[11px] font-black text-indigo-700 flex-shrink-0">
                    {display.first_name_th?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-indigo-800 truncate">
                      {display.first_name_th} {display.last_name_th}
                      {display.nickname && <span className="text-indigo-500 ml-1">({display.nickname})</span>}
                    </p>
                    <p className="text-[9px] text-indigo-500">{display.employee_code}</p>
                  </div>
                  {access.can_edit && (
                    <>
                      <button onClick={() => setShowEvalteePicker(true)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline">
                        เปลี่ยน
                      </button>
                      <button onClick={() => saveEvaluatee(null)}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700 underline">
                        ลบ
                      </button>
                    </>
                  )}
                </div>
              )
            }
            return access.can_edit ? (
              <button onClick={() => setShowEvalteePicker(true)}
                className="w-full bg-slate-50 border border-dashed border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 text-left">
                + เลือกผู้ถูกประเมิน <span className="text-[9px] text-slate-400">(ไม่บังคับ — เช่น branch manager, store staff)</span>
              </button>
            ) : (
              <p className="text-xs text-slate-400">— ไม่ระบุ —</p>
            )
          })()}

          {/* Evaluatee picker */}
          {showEvalteePicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEvalteePicker(false)} />
              <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-w-md w-full max-h-[280px] overflow-hidden flex flex-col">
                <input value={evalteeSearch} onChange={e => setEvalteeSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ / รหัส / ชื่อเล่น..." autoFocus
                  className="bg-slate-50 px-3 py-2 text-xs outline-none border-b border-slate-200" />
                <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                  {mgrOptions.length === 0
                    ? <p className="text-center py-3 text-xs text-slate-400">{evalteeSearch.trim() ? "ไม่พบ" : "กำลังโหลด..."}</p>
                    : mgrOptions.map(e => (
                      <button key={e.id}
                        onClick={() => {
                          saveEvaluatee(e.id)
                          setShowEvalteePicker(false)
                          setEvalteeSearch("")
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
                          {e.first_name_th?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">
                            {e.first_name_th} {e.last_name_th}
                            {e.nickname && <span className="text-slate-400 ml-1">({e.nickname})</span>}
                          </p>
                          <p className="text-[9px] text-slate-400">{e.employee_code} · {e.department?.name || ""}</p>
                        </div>
                      </button>
                    ))
                  }
                </div>
              </div>
            </>
          )}
        </div>

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">หมายเหตุทั่วไป</p>
          <textarea value={headerEdit.general_notes} disabled={!access.can_edit}
            onChange={e => setHeaderEdit(h => ({ ...h, general_notes: e.target.value }))} rows={2}
            placeholder="สรุปสภาพร้าน / ข้อสังเกต / สิ่งที่ต้อง follow up"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 disabled:opacity-60 resize-none" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Action Plan</p>
          <textarea value={headerEdit.action_plan} disabled={!access.can_edit}
            onChange={e => setHeaderEdit(h => ({ ...h, action_plan: e.target.value }))} rows={2}
            placeholder="แผนปรับปรุงสาขานี้"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 disabled:opacity-60 resize-none" />
        </div>
        {access.can_edit && (
          <button onClick={saveHeader} disabled={savingHeader}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50">
            {savingHeader ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            บันทึกข้อมูล
          </button>
        )}
      </div>

      {/* ── Items (the checklist) ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2 px-1">
          <ClipboardCheck size={13} className="text-indigo-500" />
          <p className="text-sm font-black text-slate-800">รายการตรวจ ({realItems.length} ข้อ · รวม {ev.total_weight} คะแนน)</p>
        </div>
        <div className="space-y-2">
          {items.map(it => {
            if (it.is_section) {
              return (
                <div key={it.id} className="bg-gradient-to-r from-violet-500 to-indigo-500 rounded-xl p-3 text-white shadow">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">หัวข้อหลัก</p>
                  <p className="text-base font-black">{it.question_th}</p>
                  {it.question_en && <p className="text-[11px] opacity-80">{it.question_en}</p>}
                </div>
              )
            }
            const a = answerById.get(it.id)
            return <ItemRow key={it.id} item={it} answer={a}
              busy={busy === it.id}
              disabled={!access.can_edit}
              onSetAnswer={(val) => saveAnswer(it.id, { answer_value: val })}
              onSetNote={(note) => saveAnswer(it.id, { note })}
              onAddPhoto={() => uploadPhotoForItem(it.id)}
              onRemovePhoto={async (url) => {
                const photos = (a?.photo_urls ?? []).filter(p => p !== url)
                await saveAnswer(it.id, { photo_urls: photos })
              }}
            />
          })}
        </div>
      </div>

      {/* ── Reviewer panel (supervisor only, after submitted) ── */}
      {access.can_review && ev.status !== "draft" && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <BadgeCheck size={14} className="text-emerald-600" />
            <p className="text-sm font-black text-emerald-900">รีวิว (Supervisor)</p>
            {ev.reviewer && (
              <span className="text-[10px] text-emerald-700">
                · โดย {ev.reviewer.first_name_th} {ev.reviewer.last_name_th} ({format(new Date(ev.reviewed_at), "d MMM yyyy HH:mm")})
              </span>
            )}
          </div>
          <textarea value={reviewerNotes} onChange={e => setReviewerNotes(e.target.value)}
            placeholder="ความเห็นของ supervisor (ผ่าน/ไม่ผ่าน + คำแนะนำ)"
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400 resize-none" />
          <button onClick={doReview}
            className="mt-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5">
            <BadgeCheck size={12} /> บันทึกรีวิว
          </button>
        </div>
      )}

      {/* ── Sticky bottom action bar ── */}
      {access.can_edit && (
        <div className="fixed bottom-3 left-3 right-3 lg:relative lg:bottom-auto lg:left-auto lg:right-auto bg-white border border-slate-200 rounded-2xl p-3 shadow-xl lg:shadow-sm flex items-center justify-between gap-2 z-30">
          <p className="text-[11px] text-slate-500">
            <b className="text-slate-800">{answered}/{realItems.length}</b> ข้อ · <b className="text-indigo-700">{Number(ev.percentage).toFixed(1)}%</b>
          </p>
          <div className="flex gap-1.5">
            {ev.status === "draft" && (
              <button onClick={submit}
                className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow">
                <Send size={12} /> ส่งฟอร์ม
              </button>
            )}
            {ev.status !== "draft" && (
              <Link href="/app/branch-eval"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black inline-flex items-center gap-1.5">
                <ArrowLeft size={12} /> เสร็จสิ้น
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// helper: pick a single file (uses hidden input)
function pickFile(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    ;(input as any).capture = "environment"  // mobile camera
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}

function Field({ label, value, onChange, type = "text", disabled, placeholder }: any) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)}
        disabled={disabled} placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 disabled:opacity-60" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
function ItemRow({ item, answer, busy, disabled, onSetAnswer, onSetNote, onAddPhoto, onRemovePhoto }: {
  item: Item; answer?: Answer; busy: boolean; disabled: boolean
  onSetAnswer: (val: any) => void
  onSetNote: (note: string) => void
  onAddPhoto: () => void
  onRemovePhoto: (url: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote] = useState(answer?.note ?? "")
  useEffect(() => { setNote(answer?.note ?? "") }, [answer?.note])
  const isPass = answer?.is_pass

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isPass === true ? "bg-emerald-50/60 border-emerald-200"
      : isPass === false ? "bg-rose-50/60 border-rose-200"
      : "bg-white border-slate-100"
    }`}>
      <div className="p-3 flex items-start gap-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
          isPass === true ? "bg-emerald-500 text-white"
          : isPass === false ? "bg-rose-500 text-white"
          : "bg-slate-200 text-slate-600"
        }`}>{item.code}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 leading-snug">{item.question_th}</p>
          {item.question_en && <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.question_en}</p>}
          {item.sub_notes.length > 0 && (
            <button onClick={() => setExpanded(s => !s)}
              className="text-[10px] text-indigo-600 hover:text-indigo-700 mt-1 inline-flex items-center gap-0.5">
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />} รายละเอียดเพิ่ม
            </button>
          )}
          {expanded && (
            <ul className="mt-1 pl-3 text-[11px] text-slate-500 space-y-0.5 list-disc">
              {item.sub_notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            {item.weight}p
          </span>
          {busy && <Loader2 size={12} className="animate-spin text-slate-400" />}
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {/* answer input */}
        {item.answer_type === "yes_no" && (
          <div className="flex gap-1.5">
            <button onClick={() => onSetAnswer({ yes: true })} disabled={disabled || busy}
              className={`flex-1 py-2 rounded-lg text-sm font-black inline-flex items-center justify-center gap-1.5 border-2 transition-all disabled:opacity-50 ${
                answer?.answer_value?.yes === true
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
              }`}>
              <Check size={14} /> YES
            </button>
            <button onClick={() => onSetAnswer({ yes: false })} disabled={disabled || busy}
              className={`flex-1 py-2 rounded-lg text-sm font-black inline-flex items-center justify-center gap-1.5 border-2 transition-all disabled:opacity-50 ${
                answer?.answer_value?.yes === false
                  ? "bg-rose-500 text-white border-rose-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"
              }`}>
              <X size={14} /> NO
            </button>
          </div>
        )}
        {item.answer_type === "score_1_5" && (
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => onSetAnswer({ score: n })} disabled={disabled || busy}
                className={`flex-1 py-2 rounded-lg text-sm font-black border-2 transition-all disabled:opacity-50 ${
                  answer?.answer_value?.score === n
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}>{n}</button>
            ))}
          </div>
        )}
        {item.answer_type === "text" && (
          <input type="text" value={answer?.answer_value?.text ?? ""}
            disabled={disabled || busy}
            onBlur={(e) => onSetAnswer({ text: e.target.value })}
            placeholder="พิมพ์คำตอบ..."
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 disabled:opacity-50" />
        )}
        {item.answer_type === "number" && (
          <input type="number" value={answer?.answer_value?.value ?? ""}
            disabled={disabled || busy}
            onBlur={(e) => onSetAnswer({ value: Number(e.target.value) })}
            placeholder="ตัวเลข"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 disabled:opacity-50" />
        )}

        {/* note */}
        <div>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            onBlur={() => { if (note !== (answer?.note ?? "")) onSetNote(note) }}
            disabled={disabled || busy} rows={2}
            placeholder="หมายเหตุ / สิ่งที่พบ"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 disabled:opacity-50 resize-none" />
        </div>

        {/* photos */}
        {((answer?.photo_urls ?? []).length > 0 || !disabled) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {(answer?.photo_urls ?? []).map((url, i) => (
              <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 group">
                <a href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
                {!disabled && (
                  <button onClick={() => onRemovePhoto(url)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <X size={9} />
                  </button>
                )}
              </div>
            ))}
            {!disabled && (
              <button onClick={onAddPhoto} disabled={busy}
                className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 text-slate-400 hover:text-indigo-500 flex items-center justify-center disabled:opacity-50">
                <Camera size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
