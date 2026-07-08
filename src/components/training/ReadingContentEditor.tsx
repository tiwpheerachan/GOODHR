"use client"
import { useEffect, useRef, useState } from "react"
import { Eye, Pencil, Bold, Heading, List, Link2, Quote, Clock, Save, Loader2, BookOpen, Download, Upload, FileText, ImagePlus } from "lucide-react"
import toast from "react-hot-toast"
import ReadingContent, { estimateReadMinutes } from "./ReadingContent"
import { splitPages } from "./ReadingLesson"
import { uploadTrainingFile } from "@/lib/training/upload"
import { normalizeConfig, blankQuestion, type PageConfig, type PageQuestion, type PageQType } from "@/lib/training/pageConfig"
import { Clock as ClockIcon, HelpCircle, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react"

// ── Template เนื้อหาตัวอย่าง (ดาวน์โหลดไปแก้แล้วอัพโหลดกลับ) ──
const CONTENT_TEMPLATE = `# ชื่อบทเรียน

เขียนคำนำสั้นๆ ที่นี่ อธิบายว่าบทเรียนนี้เกี่ยวกับอะไร ผู้เรียนจะได้อะไรบ้าง

> 💡 เคล็ดลับ: ใช้เครื่องหมาย === (บรรทัดเดียว) เพื่อแบ่งเป็น "หน้า" เหมือนหนังสือ

## สิ่งที่จะได้เรียนรู้
- หัวข้อที่ 1
- หัวข้อที่ 2
- หัวข้อที่ 3

===

## หน้า 2 — หัวข้อแรก

อธิบายเนื้อหาแบบละเอียด สามารถเน้น **ตัวหนา** หรือ *ตัวเอียง* ได้

ยกตัวอย่างเป็นข้อๆ:
1. ขั้นตอนที่หนึ่ง
2. ขั้นตอนที่สอง
3. ขั้นตอนที่สาม

===

## หน้า 3 — หัวข้อที่สอง

สามารถใส่ลิงก์ได้ เช่น [คู่มือเพิ่มเติม](https://example.com)

> ข้อความอ้างอิงสำคัญ วางไว้ให้เด่น

---

สรุปท้ายบท: ทบทวนสิ่งที่เรียนไปสั้นๆ แล้วให้ผู้เรียนทำแบบทดสอบท้ายบทเพื่อวัดความเข้าใจ
`

// ────────────────────────────────────────────────────────────────────
// ReadingContentEditor — เขียนเนื้อหาบทความ (Markdown-lite) แบบหนังสือ
//   • แบ่งหน้าด้วย === · พรีวิวสด · ดาวน์โหลด template · อัพโหลดไฟล์เนื้อหา
// ────────────────────────────────────────────────────────────────────
export default function ReadingContentEditor({
  initialContent,
  onSave,
  initialPageConfig,
  onSaveConfig,
}: {
  initialContent: string | null | undefined
  onSave: (content: string) => Promise<void> | void
  initialPageConfig?: any
  onSaveConfig?: (config: PageConfig[]) => Promise<void> | void
}) {
  const [content, setContent] = useState(initialContent ?? "")
  const [tab, setTab] = useState<"write" | "preview">("write")
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const imgRef = useRef<HTMLInputElement | null>(null)
  const dirty = content !== (initialContent ?? "")

  useEffect(() => { setContent(initialContent ?? "") }, [initialContent])

  const doSave = async () => {
    if (!dirty) return
    setSaving(true)
    try { await onSave(content) } finally { setSaving(false) }
  }

  const wrap = (before: string, after = "", placeholder = "") => {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart, e = ta.selectionEnd
    const sel = content.slice(s, e) || placeholder
    const next = content.slice(0, s) + before + sel + after + content.slice(e)
    setContent(next)
    requestAnimationFrame(() => {
      ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length
    })
  }
  const prefixLine = (prefix: string) => {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const lineStart = content.lastIndexOf("\n", s - 1) + 1
    setContent(content.slice(0, lineStart) + prefix + content.slice(lineStart))
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + prefix.length })
  }
  const insertAtCursor = (ins: string) => {
    const ta = taRef.current
    if (!ta) { setContent(c => c + ins); return }
    const s = ta.selectionStart
    setContent(content.slice(0, s) + ins + content.slice(s))
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + ins.length })
  }
  const insertPageBreak = () => insertAtCursor("\n\n===\n\n")

  // ── อัปโหลดรูปแล้วแทรก markdown ![](url) ──
  const onUploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("รองรับไฟล์รูปภาพเท่านั้น"); return }
    if (file.size > 15 * 1024 * 1024) { toast.error("รูปใหญ่เกิน 15MB"); return }
    setUploadingImg(true)
    const t = toast.loading("กำลังอัปโหลดรูป...")
    try {
      const res = await uploadTrainingFile(file, { subfolder: "reading-images" })
      const alt = file.name.replace(/\.[^.]+$/, "")
      insertAtCursor(`\n\n![${alt}](${res.url})\n\n`)
      toast.success("แทรกรูปแล้ว", { id: t })
    } catch (e: any) {
      toast.error(e?.message || "อัปโหลดรูปไม่สำเร็จ", { id: t })
    } finally {
      setUploadingImg(false)
    }
  }

  // ── ดาวน์โหลด template ──
  const downloadTemplate = () => {
    const blob = new Blob([CONTENT_TEMPLATE], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template-บทเรียน.md"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("ดาวน์โหลด template แล้ว — แก้ไขแล้วอัพโหลดกลับได้เลย")
  }

  // ── อัพโหลดไฟล์เนื้อหา (.md / .txt) ──
  const onUpload = async (file: File) => {
    if (!/\.(md|markdown|txt)$/i.test(file.name)) { toast.error("รองรับไฟล์ .md หรือ .txt เท่านั้น"); return }
    if (file.size > 2 * 1024 * 1024) { toast.error("ไฟล์ใหญ่เกิน 2MB"); return }
    const text = await file.text()
    setContent(prev => (prev.trim() ? prev + "\n\n===\n\n" + text : text))
    setTab("write")
    toast.success("โหลดเนื้อหาจากไฟล์แล้ว — ตรวจดูแล้วกดบันทึก")
  }

  const estMin = estimateReadMinutes(content)
  const pageCount = splitPages(content).length

  return (
    <div className="bg-slate-50 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1"><BookOpen size={13} /> เนื้อหาบทเรียน (อ่านให้จบ)</p>
        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">{pageCount} หน้า</span>
        <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Clock size={10} /> ~{estMin} นาที</span>
        <div className="ml-auto flex items-center gap-1 bg-white rounded-lg p-0.5 border border-slate-200">
          <button onClick={() => setTab("write")}
            className={`px-2 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 ${tab === "write" ? "bg-sky-500 text-white" : "text-slate-500"}`}>
            <Pencil size={11} /> เขียน
          </button>
          <button onClick={() => setTab("preview")}
            className={`px-2 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 ${tab === "preview" ? "bg-sky-500 text-white" : "text-slate-500"}`}>
            <Eye size={11} /> พรีวิวหนังสือ
          </button>
        </div>
      </div>

      {/* Template / Upload */}
      <div className="flex items-center gap-2 flex-wrap bg-white rounded-lg border border-dashed border-slate-200 p-2">
        <FileText size={13} className="text-slate-400" />
        <p className="text-[11px] text-slate-500 font-medium">มีเทมเพลตให้เริ่มง่ายๆ:</p>
        <button onClick={downloadTemplate}
          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">
          <Download size={12} /> ดาวน์โหลด Template
        </button>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
          <Upload size={12} /> อัพโหลดเนื้อหา (.md/.txt)
        </button>
        <input ref={fileRef} type="file" accept=".md,.markdown,.txt" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = "" }} />
      </div>

      {tab === "write" ? (
        <>
          {/* toolbar */}
          <div className="flex items-center gap-1 flex-wrap">
            {[
              { icon: Heading, title: "หัวข้อ", fn: () => prefixLine("## ") },
              { icon: Bold, title: "ตัวหนา", fn: () => wrap("**", "**", "ข้อความ") },
              { icon: List, title: "รายการ", fn: () => prefixLine("- ") },
              { icon: Quote, title: "อ้างอิง", fn: () => prefixLine("> ") },
              { icon: Link2, title: "ลิงก์", fn: () => wrap("[", "](https://)", "ข้อความลิงก์") },
            ].map((b, i) => (
              <button key={i} title={b.title} onClick={b.fn}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center">
                <b.icon size={13} />
              </button>
            ))}
            <button onClick={() => imgRef.current?.click()} disabled={uploadingImg} title="แทรกรูปภาพ"
              className="flex items-center gap-1 h-7 px-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 text-[11px] font-bold disabled:opacity-50">
              {uploadingImg ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />} รูปภาพ
            </button>
            <button onClick={insertPageBreak} title="แบ่งหน้า (===)"
              className="flex items-center gap-1 h-7 px-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-[11px] font-bold">
              <BookOpen size={12} /> แบ่งหน้า
            </button>
            <input ref={imgRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onUploadImage(f); e.target.value = "" }} />
          </div>
          <textarea
            ref={taRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onBlur={doSave}
            rows={14}
            placeholder={"เขียนเนื้อหาบทเรียนที่นี่...\n\n# หัวข้อใหญ่\nข้อความปกติ **เน้นตัวหนา** ได้\n\n===  ← แบ่งหน้าเหมือนหนังสือ\n\n## หน้าถัดไป\n- ข้อ 1\n- ข้อ 2"}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400 font-mono leading-relaxed resize-y"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] text-slate-400">Markdown: # หัวข้อ · **หนา** · - รายการ · &gt; อ้างอิง · [ลิงก์](url) · 🖼️ รูป · <b className="text-amber-600">===</b> แบ่งหน้า</p>
            <button onClick={doSave} disabled={!dirty || saving}
              className="ml-auto px-3 py-1.5 text-[11px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-40 bg-sky-500 text-white hover:bg-sky-600">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {dirty ? "บันทึกเนื้อหา" : "บันทึกแล้ว"}
            </button>
          </div>
        </>
      ) : (
        <BookPreview content={content} />
      )}

      {/* ตั้งค่าต่อหน้า: เวลาอ่าน + ควิซคั่นหน้า */}
      {onSaveConfig && (
        <PageSettingsEditor
          pages={splitPages(content)}
          initialConfig={initialPageConfig}
          onSave={onSaveConfig}
        />
      )}

      {/* hint: ควิซท้ายบท */}
      <p className="text-[10px] text-slate-400 bg-white rounded-lg border border-slate-100 px-2.5 py-1.5">
        💡 นอกจากควิซคั่นหน้าด้านบน ยังเพิ่ม <b className="text-amber-600">ควิซท้ายบท</b> ด้านล่างได้ — เลือกชนิดคำถามได้หลายแบบ: หลายตัวเลือก · ถูก/ผิด · เติมคำ
      </p>
    </div>
  )
}

// ════════════ ตั้งค่าต่อหน้า — เวลาอ่าน + ควิซคั่นหน้า ════════════
function PageSettingsEditor({
  pages, initialConfig, onSave,
}: {
  pages: string[]
  initialConfig: any
  onSave: (config: PageConfig[]) => Promise<void> | void
}) {
  const [cfg, setCfg] = useState<PageConfig[]>(() => normalizeConfig(initialConfig, pages.length))
  const [open, setOpen] = useState<number | null>(null)
  const saveTimer = useRef<any>(null)

  // sync ความยาว config ตามจำนวนหน้า (แต่คงค่าที่แก้ไว้)
  useEffect(() => {
    setCfg(prev => normalizeConfig(prev.length ? prev : initialConfig, pages.length))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length])

  // บันทึกแบบ debounce — กัน fetch ทุก keystroke
  const persist = (next: PageConfig[]) => {
    setCfg(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onSave(next), 700)
  }
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])
  const update = (i: number, patch: Partial<PageConfig>) => {
    const next = cfg.map((c, idx) => idx === i ? { ...c, ...patch } : c)
    persist(next)
  }
  const pageTitle = (p: string, i: number) => {
    const h = /^#{1,3}\s+(.+)$/m.exec(p || "")
    return h ? h[1].trim().slice(0, 40) : `หน้า ${i + 1}`
  }

  if (pages.length <= 1) {
    return (
      <div className="bg-white rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[11px] text-slate-400">
        💡 ใส่ตัวแบ่งหน้า <b className="text-amber-600">===</b> เพื่อแยกเป็นหลายหน้า แล้วจะตั้ง <b>เวลาอ่าน</b> และ <b>ควิซคั่นหน้า</b> รายหน้าได้
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
      <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><ClockIcon size={13} /> ตั้งค่าแต่ละหน้า (เวลาอ่าน + ควิซคั่นหน้า)</p>
      {pages.map((p, i) => {
        const c = cfg[i] || {}
        const quiz = c.quiz ?? []
        const mins = c.read_seconds ? Math.round((c.read_seconds / 60) * 10) / 10 : ""
        const isOpen = open === i
        return (
          <div key={i} className="border border-slate-100 rounded-lg overflow-hidden">
            <button onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left">
              <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-black text-[11px]">{i + 1}</span>
              <span className="flex-1 text-xs font-bold text-slate-700 truncate">{pageTitle(p, i)}</span>
              {c.read_seconds ? <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><ClockIcon size={9} />{mins} น.</span> : null}
              {quiz.length > 0 ? <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><HelpCircle size={9} />{quiz.length} ข้อ</span> : null}
              {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {isOpen && (
              <div className="px-3 py-3 space-y-3 bg-slate-50/50 border-t border-slate-100">
                {/* เวลาอ่าน */}
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1"><ClockIcon size={12} /> เวลาอ่านขั้นต่ำ</label>
                  <input type="number" min={0} step={0.5} defaultValue={mins}
                    onBlur={e => {
                      const v = e.target.value.trim()
                      const secs = v === "" ? null : Math.max(0, Math.round(Number(v) * 60))
                      update(i, { read_seconds: secs })
                    }}
                    placeholder="ไม่ตั้ง"
                    className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-amber-400" />
                  <span className="text-[11px] text-slate-400">นาที</span>
                  <span className="text-[10px] text-slate-400">(เว้นว่าง = ไม่บังคับเวลา)</span>
                </div>

                {/* ควิซคั่นหน้า */}
                <PageQuizBuilder
                  quiz={quiz}
                  pageIdx={i}
                  onChange={next => update(i, { quiz: next })}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── ตัวสร้างควิซคั่นหน้า (mc/tf/fill) ──
function PageQuizBuilder({ quiz, pageIdx, onChange }: { quiz: PageQuestion[]; pageIdx: number; onChange: (q: PageQuestion[]) => void }) {
  const addQ = () => onChange([...quiz, blankQuestion(`${pageIdx}_${quiz.length}_${quiz.length + 1}`)])
  const upd = (qi: number, patch: Partial<PageQuestion>) => onChange(quiz.map((q, idx) => idx === qi ? { ...q, ...patch } : q))
  const del = (qi: number) => onChange(quiz.filter((_, idx) => idx !== qi))

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1"><HelpCircle size={12} /> ควิซคั่นหน้า (ตอบถูกก่อนไปต่อ)</p>
        <button onClick={addQ} className="ml-auto flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100">
          <Plus size={11} /> เพิ่มคำถาม
        </button>
      </div>
      {quiz.length === 0 && <p className="text-[10px] text-slate-400 italic">ยังไม่มีควิซหน้านี้ (ไม่บังคับ)</p>}
      {quiz.map((q, qi) => (
        <div key={q.id} className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-500">ข้อ {qi + 1}</span>
            <select value={q.type} onChange={e => {
              const type = e.target.value as PageQType
              // reset answer/options ตามชนิด
              if (type === "mc") upd(qi, { type, options: q.options?.length ? q.options : ["", ""], answer: 0 })
              else if (type === "tf") upd(qi, { type, answer: true })
              else upd(qi, { type, answer: "" })
            }} className="text-[11px] font-bold border border-slate-200 rounded-lg px-2 py-1 outline-none">
              <option value="mc">หลายตัวเลือก</option>
              <option value="tf">ถูก/ผิด</option>
              <option value="fill">เติมคำ</option>
            </select>
            <button onClick={() => del(qi)} className="ml-auto text-rose-500 hover:bg-rose-50 rounded p-1"><Trash2 size={12} /></button>
          </div>
          <input value={q.question} onChange={e => upd(qi, { question: e.target.value })} placeholder="โจทย์คำถาม..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-sky-400" />

          {q.type === "mc" && (
            <div className="space-y-1.5">
              {(q.options ?? []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct_${q.id}`} checked={Number(q.answer) === oi} onChange={() => upd(qi, { answer: oi })} title="ตั้งเป็นคำตอบที่ถูก" />
                  <input value={opt} onChange={e => upd(qi, { options: (q.options ?? []).map((o, idx) => idx === oi ? e.target.value : o) })}
                    placeholder={`ตัวเลือก ${oi + 1}`}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-sky-400" />
                  {(q.options?.length ?? 0) > 2 && (
                    <button onClick={() => upd(qi, { options: (q.options ?? []).filter((_, idx) => idx !== oi), answer: Number(q.answer) >= oi && Number(q.answer) > 0 ? Number(q.answer) - 1 : q.answer })}
                      className="text-rose-400 hover:bg-rose-50 rounded p-0.5"><Trash2 size={11} /></button>
                  )}
                </div>
              ))}
              <button onClick={() => upd(qi, { options: [...(q.options ?? []), ""] })}
                className="text-[10px] font-bold text-sky-600 hover:bg-sky-50 rounded px-2 py-0.5 flex items-center gap-1"><Plus size={10} /> เพิ่มตัวเลือก</button>
              <p className="text-[10px] text-slate-400">• เลือกวงกลมหน้าตัวเลือกที่ถูกต้อง</p>
            </div>
          )}
          {q.type === "tf" && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => upd(qi, { answer: true })}
                className={`py-1.5 rounded-lg border-2 font-bold text-xs ${q.answer === true ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>เฉลย: ถูก ✓</button>
              <button onClick={() => upd(qi, { answer: false })}
                className={`py-1.5 rounded-lg border-2 font-bold text-xs ${q.answer === false ? "border-rose-400 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500"}`}>เฉลย: ผิด ✗</button>
            </div>
          )}
          {q.type === "fill" && (
            <input value={typeof q.answer === "string" ? q.answer : ""} onChange={e => upd(qi, { answer: e.target.value })}
              placeholder="คำตอบที่ถูก (ใส่หลายคำตอบคั่นด้วย | )"
              className="w-full bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-emerald-400" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── พรีวิวแบบหนังสือ (พลิกหน้าได้) ──
function BookPreview({ content }: { content: string }) {
  const pages = splitPages(content)
  const [p, setP] = useState(0)
  const page = Math.min(p, pages.length - 1)
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-amber-100 shadow-sm px-4 py-5 max-h-[420px] overflow-y-auto"
        style={{ background: "linear-gradient(180deg,#fffdf8,#fdf9f0)" }}>
        <div className="text-[15px] leading-[1.85] text-[#3d362b]">
          <ReadingContent content={pages[page]} />
        </div>
      </div>
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setP(x => Math.max(0, x - 1))} disabled={page === 0}
            className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white disabled:opacity-40">ก่อนหน้า</button>
          <span className="text-xs font-bold text-slate-500">หน้า {page + 1} / {pages.length}</span>
          <button onClick={() => setP(x => Math.min(pages.length - 1, x + 1))} disabled={page >= pages.length - 1}
            className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white disabled:opacity-40">ถัดไป</button>
        </div>
      )}
    </div>
  )
}
