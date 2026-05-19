"use client"
import { useState } from "react"
import { X, Check, Loader2, Plus, Trash2, Clock, Edit2 } from "lucide-react"
import toast from "react-hot-toast"

type QType = "mc" | "tf" | "fill"

export type Checkpoint = {
  id: string
  module_id: string
  trigger_at_sec: number
  question_text: string
  question_type: QType
  options?: Array<{ id: string; text: string }> | null
  correct_answer: any
  blocks_progress: boolean
}

const Q_LABEL: Record<QType, string> = {
  mc: "หลายตัวเลือก",
  tf: "ถูก/ผิด",
  fill: "เติมคำ",
}

// ────────────────────────────────────────────────────────────────────
// Editor section — แสดงรายการ checkpoint + ปุ่มเพิ่ม + modal
// ────────────────────────────────────────────────────────────────────
export default function CheckpointEditor({
  moduleId,
  checkpoints,
  onChange,
  videoDuration,
}: {
  moduleId: string
  checkpoints: Checkpoint[]
  onChange: () => void  // call after add/edit/delete
  videoDuration?: number | null
}) {
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState<Checkpoint | null>(null)
  const [showModal, setShowModal] = useState(false)

  const del = async (id: string) => {
    if (!confirm("ลบ checkpoint นี้?")) return
    await fetch(`/api/training/checkpoints?id=${id}`, { method: "DELETE" })
    toast.success("ลบแล้ว")
    onChange()
  }

  const sorted = [...checkpoints].sort((a, b) => a.trigger_at_sec - b.trigger_at_sec)

  return (
    <div className="bg-purple-50/40 border border-purple-200 rounded-xl p-3">
      <button onClick={() => setShow(s => !s)} className="text-xs font-bold text-purple-700 flex items-center gap-1 w-full">
        🎯 Checkpoint Quiz (เด้งระหว่างวิดีโอ) — {checkpoints.length} ข้อ
        <span className="ml-auto">{show ? "▲" : "▼"}</span>
      </button>

      {show && (
        <div className="mt-2 space-y-2">
          {sorted.length === 0 && (
            <p className="text-[11px] text-purple-600/70 italic text-center py-2">ยังไม่มี checkpoint — กดเพิ่มด้านล่าง</p>
          )}
          {sorted.map(cp => (
            <div key={cp.id} className="bg-white rounded-lg p-2 flex items-start gap-2 group">
              <Clock size={12} className="text-purple-500 flex-shrink-0 mt-0.5" />
              <span className="font-mono font-bold text-purple-600 text-[11px] flex-shrink-0">
                {fmtTime(cp.trigger_at_sec)}
              </span>
              <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                {Q_LABEL[cp.question_type]}
              </span>
              <span className="flex-1 text-xs text-slate-700 truncate" title={cp.question_text}>
                {cp.question_text}
              </span>
              <button onClick={() => { setEditing(cp); setShowModal(true) }}
                className="p-1 text-slate-400 hover:text-purple-600 opacity-0 group-hover:opacity-100">
                <Edit2 size={11} />
              </button>
              <button onClick={() => del(cp.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          <button onClick={() => { setEditing(null); setShowModal(true) }}
            className="w-full py-2 border-2 border-dashed border-purple-300 rounded-lg text-[11px] font-bold text-purple-700 hover:bg-purple-100 flex items-center justify-center gap-1">
            <Plus size={12} /> เพิ่ม Checkpoint
          </button>
        </div>
      )}

      {showModal && (
        <CheckpointFormModal
          moduleId={moduleId}
          videoDuration={videoDuration}
          existing={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); onChange() }}
        />
      )}
    </div>
  )
}

const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec) % 60).padStart(2, "0")}`

// ────────────────────────────────────────────────────────────────────
// Modal — สร้าง/แก้ checkpoint (รองรับ MC, T/F, Fill)
// ────────────────────────────────────────────────────────────────────
function CheckpointFormModal({
  moduleId, videoDuration, existing, onClose, onSaved,
}: {
  moduleId: string
  videoDuration?: number | null
  existing: Checkpoint | null
  onClose: () => void
  onSaved: () => void
}) {
  const [triggerMin, setTriggerMin] = useState(existing ? Math.floor(existing.trigger_at_sec / 60) : 0)
  const [triggerSec, setTriggerSec] = useState(existing ? existing.trigger_at_sec % 60 : 0)
  const [questionText, setQuestionText] = useState(existing?.question_text ?? "")
  const [questionType, setQuestionType] = useState<QType>(existing?.question_type ?? "mc")
  const [options, setOptions] = useState<Array<{ id: string; text: string }>>(
    existing?.options ?? [
      { id: "0", text: "" }, { id: "1", text: "" },
      { id: "2", text: "" }, { id: "3", text: "" },
    ]
  )
  const [mcCorrect, setMcCorrect] = useState<string>(
    existing?.question_type === "mc" ? String(existing.correct_answer) : ""
  )
  const [tfCorrect, setTfCorrect] = useState<string>(
    existing?.question_type === "tf"
      ? (existing.correct_answer === true || existing.correct_answer === "true" ? "true" : "false")
      : "true"
  )
  const [fillCorrect, setFillCorrect] = useState<string>(
    existing?.question_type === "fill"
      ? (Array.isArray(existing.correct_answer) ? existing.correct_answer.join("|") : String(existing.correct_answer))
      : ""
  )
  const [blocksProgress, setBlocksProgress] = useState(existing?.blocks_progress ?? true)
  const [saving, setSaving] = useState(false)

  const triggerTotal = triggerMin * 60 + triggerSec

  const save = async () => {
    if (!questionText.trim()) { toast.error("กรอกคำถามก่อน"); return }
    if (triggerTotal <= 0) { toast.error("กำหนดเวลา trigger > 0"); return }
    if (videoDuration && triggerTotal > videoDuration) { toast.error("เวลา trigger เกินความยาววิดีโอ"); return }

    let correct_answer: any = null
    let opts: any = null
    if (questionType === "mc") {
      opts = options.filter(o => o.text.trim())
      if (opts.length < 2) { toast.error("ใส่ตัวเลือกอย่างน้อย 2 ข้อ"); return }
      if (!mcCorrect || !opts.find((o: any) => o.id === mcCorrect)) { toast.error("เลือกคำตอบที่ถูก"); return }
      correct_answer = mcCorrect
    } else if (questionType === "tf") {
      correct_answer = tfCorrect === "true"
    } else if (questionType === "fill") {
      const parts = fillCorrect.split("|").map(s => s.trim()).filter(Boolean)
      if (parts.length === 0) { toast.error("ใส่เฉลย"); return }
      correct_answer = parts.length === 1 ? parts[0] : parts
    }

    setSaving(true)
    const body = {
      module_id: moduleId,
      trigger_at_sec: triggerTotal,
      question_text: questionText.trim(),
      question_type: questionType,
      options: opts,
      correct_answer,
      blocks_progress: blocksProgress,
    }

    try {
      const url = "/api/training/checkpoints"
      const res = existing
        ? await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: existing.id, ...body }) })
        : await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "บันทึกไม่สำเร็จ")
      toast.success(existing ? "อัปเดตแล้ว" : "เพิ่มแล้ว")
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="font-black text-slate-800 flex items-center gap-2">
              🎯 {existing ? "แก้ไข" : "เพิ่ม"} Checkpoint
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">คำถามจะเด้งระหว่างเล่นวิดีโอ — ผู้เรียนต้องตอบก่อนดูต่อ</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Trigger time */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">⏱ เวลาที่จะเด้ง</p>
            <div className="flex items-center gap-2">
              <input type="number" min={0} value={triggerMin}
                onChange={e => setTriggerMin(Math.max(0, Number(e.target.value) || 0))}
                className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-center" />
              <span className="text-xs font-bold text-slate-500">นาที :</span>
              <input type="number" min={0} max={59} value={triggerSec}
                onChange={e => setTriggerSec(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-center" />
              <span className="text-xs font-bold text-slate-500">วินาที</span>
              {videoDuration && (
                <span className="text-[10px] text-slate-400 ml-auto">วิดีโอยาว {fmtTime(videoDuration)}</span>
              )}
            </div>
          </div>

          {/* Question type */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">ประเภทคำถาม</p>
            <div className="grid grid-cols-3 gap-2">
              {(["mc", "tf", "fill"] as QType[]).map(t => (
                <button key={t} onClick={() => setQuestionType(t)}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border-2 transition-all ${questionType === t ? "border-purple-400 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  {Q_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Question text */}
          <div>
            <p className="text-xs font-bold text-slate-600 mb-1.5">คำถาม *</p>
            <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={2}
              placeholder="เช่น สิ่งที่กล่าวถึงในวิดีโอคืออะไร?"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400" />
          </div>

          {/* MC options */}
          {questionType === "mc" && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-1.5">ตัวเลือก (เลือก ◎ ที่คำตอบถูก)</p>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <input type="radio" name="mc-correct" value={o.id} checked={mcCorrect === o.id}
                      onChange={() => setMcCorrect(o.id)}
                      className="w-4 h-4 text-purple-500" />
                    <input value={o.text}
                      onChange={e => setOptions(os => os.map(x => x.id === o.id ? { ...x, text: e.target.value } : x))}
                      placeholder={`ตัวเลือก ${i + 1}`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-purple-400" />
                    {options.length > 2 && (
                      <button onClick={() => setOptions(os => os.filter(x => x.id !== o.id))} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 6 && (
                <button onClick={() => setOptions(os => [...os, { id: String(os.length), text: "" }])}
                  className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-bold">
                  + เพิ่มตัวเลือก
                </button>
              )}
            </div>
          )}

          {/* TF answer */}
          {questionType === "tf" && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-1.5">คำตอบที่ถูก</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTfCorrect("true")}
                  className={`py-3 rounded-lg border-2 font-bold ${tfCorrect === "true" ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                  ✓ ถูก
                </button>
                <button onClick={() => setTfCorrect("false")}
                  className={`py-3 rounded-lg border-2 font-bold ${tfCorrect === "false" ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500"}`}>
                  ✗ ผิด
                </button>
              </div>
            </div>
          )}

          {/* Fill answer */}
          {questionType === "fill" && (
            <div>
              <p className="text-xs font-bold text-slate-600 mb-1.5">เฉลย (คั่นด้วย | ถ้ามีหลายคำตอบที่ยอมรับ)</p>
              <input value={fillCorrect} onChange={e => setFillCorrect(e.target.value)}
                placeholder="เช่น Bangkok|กรุงเทพ|bkk"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400" />
              <p className="text-[10px] text-slate-400 mt-1">ไม่สนใจตัวพิมพ์ใหญ่-เล็ก, ตัดช่องว่างหน้า-หลัง</p>
            </div>
          )}

          {/* Blocks progress */}
          <label className="flex items-center gap-2 cursor-pointer p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <input type="checkbox" checked={blocksProgress} onChange={e => setBlocksProgress(e.target.checked)}
              className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-800 font-bold flex-1">บังคับตอบถูกจึงเล่นต่อได้</span>
          </label>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
            ยกเลิก
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {existing ? "บันทึก" : "เพิ่ม"}
          </button>
        </div>
      </div>
    </div>
  )
}
