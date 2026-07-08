"use client"
import { useEffect, useRef, useState } from "react"
import { Eye, Pencil, Bold, Heading, List, Link2, Quote, Clock, Save, Loader2 } from "lucide-react"
import ReadingContent, { estimateReadMinutes } from "./ReadingContent"

// ────────────────────────────────────────────────────────────────────
// ReadingContentEditor — เขียนเนื้อหาบทความ (Markdown-lite) + พรีวิวสด
//   บันทึกอัตโนมัติเมื่อ blur / กดปุ่มบันทึก
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
  const dirty = content !== (initialContent ?? "")

  useEffect(() => { setContent(initialContent ?? "") }, [initialContent])

  const doSave = async () => {
    if (!dirty) return
    setSaving(true)
    try { await onSave(content) } finally { setSaving(false) }
  }

  // แทรก markdown รอบ selection
  const wrap = (before: string, after = "", placeholder = "") => {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart, e = ta.selectionEnd
    const sel = content.slice(s, e) || placeholder
    const next = content.slice(0, s) + before + sel + after + content.slice(e)
    setContent(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = s + before.length
      ta.selectionEnd = s + before.length + sel.length
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

  const estMin = estimateReadMinutes(content)

  return (
    <div className="bg-slate-50 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-bold text-slate-600 flex items-center gap-1"><Pencil size={12} /> เนื้อหาบทความ (อ่านให้จบ)</p>
        <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Clock size={10} /> ~{estMin} นาที</span>
        <div className="ml-auto flex items-center gap-1 bg-white rounded-lg p-0.5 border border-slate-200">
          <button onClick={() => setTab("write")}
            className={`px-2 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 ${tab === "write" ? "bg-sky-500 text-white" : "text-slate-500"}`}>
            <Pencil size={11} /> เขียน
          </button>
          <button onClick={() => setTab("preview")}
            className={`px-2 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 ${tab === "preview" ? "bg-sky-500 text-white" : "text-slate-500"}`}>
            <Eye size={11} /> พรีวิว
          </button>
        </div>
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
          </div>
          <textarea
            ref={taRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onBlur={doSave}
            rows={12}
            placeholder={"เขียนเนื้อหาบทเรียนที่นี่...\n\n# หัวข้อใหญ่\nข้อความปกติ **เน้นตัวหนา** ได้\n\n## หัวข้อย่อย\n- ข้อ 1\n- ข้อ 2\n\n> ข้อความอ้างอิงสำคัญ"}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400 font-mono leading-relaxed resize-y"
          />
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-slate-400">รองรับ Markdown: # หัวข้อ · **หนา** · - รายการ · &gt; อ้างอิง · [ลิงก์](url)</p>
            <button onClick={doSave} disabled={!dirty || saving}
              className="ml-auto px-3 py-1.5 text-[11px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-40 bg-sky-500 text-white hover:bg-sky-600">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {dirty ? "บันทึกเนื้อหา" : "บันทึกแล้ว"}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-4 max-h-[400px] overflow-y-auto">
          <ReadingContent content={content} />
        </div>
      )}
    </div>
  )
}
