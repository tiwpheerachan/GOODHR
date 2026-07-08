"use client"
import { useEffect, useRef, useState } from "react"
import { Eye, Pencil, Bold, Heading, List, Link2, Quote, Clock, Save, Loader2, BookOpen, Download, Upload, FileText } from "lucide-react"
import toast from "react-hot-toast"
import ReadingContent, { estimateReadMinutes } from "./ReadingContent"
import { splitPages } from "./ReadingLesson"

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
}: {
  initialContent: string | null | undefined
  onSave: (content: string) => Promise<void> | void
}) {
  const [content, setContent] = useState(initialContent ?? "")
  const [tab, setTab] = useState<"write" | "preview">("write")
  const [saving, setSaving] = useState(false)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
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
  const insertPageBreak = () => {
    const ta = taRef.current
    if (!ta) { setContent(content + "\n\n===\n\n"); return }
    const s = ta.selectionStart
    const ins = "\n\n===\n\n"
    setContent(content.slice(0, s) + ins + content.slice(s))
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + ins.length })
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
            <button onClick={insertPageBreak} title="แบ่งหน้า (===)"
              className="flex items-center gap-1 h-7 px-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-[11px] font-bold">
              <BookOpen size={12} /> แบ่งหน้า
            </button>
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
            <p className="text-[10px] text-slate-400">Markdown: # หัวข้อ · **หนา** · - รายการ · &gt; อ้างอิง · [ลิงก์](url) · <b className="text-amber-600">===</b> แบ่งหน้า</p>
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

      {/* hint: ควิซท้ายบท */}
      <p className="text-[10px] text-slate-400 bg-white rounded-lg border border-slate-100 px-2.5 py-1.5">
        💡 อ่านจบแล้วให้เพิ่ม <b className="text-amber-600">ควิซท้ายบท</b> ด้านล่างได้ — เลือกชนิดคำถามได้หลายแบบ: หลายตัวเลือก · ถูก/ผิด · เติมคำ
      </p>
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
