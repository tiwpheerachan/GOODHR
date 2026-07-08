"use client"
import React from "react"

// ────────────────────────────────────────────────────────────────────
// ReadingContent — เรนเดอร์เนื้อหาบทความ (Markdown-lite → React)
//   รองรับ: # ## ### หัวข้อ · **หนา** · *เอียง* · `code` · [ลิงก์](url)
//            - / * bullet · 1. ลำดับเลข · > อ้างอิง · --- เส้นคั่น · ![alt](url) รูป
//   เนื้อหาเขียนโดยผู้ดูแล (trusted) — ไม่ inject HTML ดิบ จึงปลอดภัยจาก XSS
// ────────────────────────────────────────────────────────────────────

// inline formatting → React nodes
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyPrefix}-${i++}`
    if (tok.startsWith("**")) {
      nodes.push(<strong key={key} className="font-black text-slate-900">{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith("`")) {
      nodes.push(<code key={key} className="px-1.5 py-0.5 rounded bg-slate-100 text-rose-600 text-[0.9em] font-mono">{tok.slice(1, -1)}</code>)
    } else if (tok.startsWith("![")) {
      const mm = /!\[([^\]]*)\]\(([^)]+)\)/.exec(tok)
      if (mm) nodes.push(<img key={key} src={mm[2]} alt={mm[1]} className="my-3 rounded-xl max-w-full mx-auto shadow-sm" />)
    } else if (tok.startsWith("[")) {
      const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok)
      if (mm) nodes.push(<a key={key} href={mm[2]} target="_blank" rel="noreferrer" className="text-sky-600 underline font-medium hover:text-sky-700">{mm[1]}</a>)
    } else if (tok.startsWith("*")) {
      nodes.push(<em key={key}>{tok.slice(1, -1)}</em>)
    }
    last = regex.lastIndex
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

type Block =
  | { t: "h"; level: number; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "quote"; text: string }
  | { t: "hr" }
  | { t: "p"; text: string }

function parseBlocks(src: string): Block[] {
  const lines = (src ?? "").replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    let line = lines[i]
    // ข้ามบรรทัดว่าง
    if (line.trim() === "") { i++; continue }
    // เส้นคั่น / ตัวแบ่งหน้า (=== ก็ถือเป็นเส้นคั่นเวลาโชว์รวมทั้งเนื้อหา)
    if (/^\s*(-{3,}|\*{3,}|_{3,}|={3,})\s*$/.test(line)) { blocks.push({ t: "hr" }); i++; continue }
    // หัวข้อ
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) { blocks.push({ t: "h", level: Math.min(h[1].length, 4), text: h[2] }); i++; continue }
    // อ้างอิง
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++ }
      blocks.push({ t: "quote", text: buf.join(" ") }); continue
    }
    // bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, "")); i++ }
      blocks.push({ t: "ul", items }); continue
    }
    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, "")); i++ }
      blocks.push({ t: "ol", items }); continue
    }
    // paragraph — รวมบรรทัดติดกันจนเจอบรรทัดว่าง/บล็อกอื่น
    const buf: string[] = []
    while (
      i < lines.length && lines[i].trim() !== "" &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*(-{3,}|\*{3,}|_{3,}|={3,})\s*$/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) { buf.push(lines[i]); i++ }
    blocks.push({ t: "p", text: buf.join("\n") })
  }
  return blocks
}

export default function ReadingContent({ content, className = "" }: { content: string | null | undefined; className?: string }) {
  const blocks = React.useMemo(() => parseBlocks(content ?? ""), [content])
  if (!content || !content.trim()) {
    return <p className="text-slate-400 text-sm italic">— ยังไม่มีเนื้อหา —</p>
  }
  return (
    <div className={`reading-content text-slate-700 leading-relaxed ${className}`}>
      {blocks.map((b, idx) => {
        const k = `b${idx}`
        switch (b.t) {
          case "h": {
            const sz = b.level === 1 ? "text-2xl mt-5 mb-2" : b.level === 2 ? "text-xl mt-4 mb-2" : b.level === 3 ? "text-lg mt-3 mb-1.5" : "text-base mt-2 mb-1"
            return <p key={k} className={`font-black text-slate-900 ${sz}`}>{renderInline(b.text, k)}</p>
          }
          case "hr":
            return <hr key={k} className="my-5 border-slate-200" />
          case "quote":
            return (
              <blockquote key={k} className="my-3 border-l-4 border-sky-300 bg-sky-50/60 pl-4 pr-3 py-2 rounded-r-lg text-slate-600 italic">
                {renderInline(b.text, k)}
              </blockquote>
            )
          case "ul":
            return (
              <ul key={k} className="my-2.5 space-y-1 list-disc pl-5">
                {b.items.map((it, j) => <li key={j}>{renderInline(it, `${k}-${j}`)}</li>)}
              </ul>
            )
          case "ol":
            return (
              <ol key={k} className="my-2.5 space-y-1 list-decimal pl-5">
                {b.items.map((it, j) => <li key={j}>{renderInline(it, `${k}-${j}`)}</li>)}
              </ol>
            )
          default:
            return (
              <p key={k} className="my-2.5 whitespace-pre-wrap break-words">
                {renderInline(b.text, k)}
              </p>
            )
        }
      })}
    </div>
  )
}

// ── ประมาณเวลาอ่าน (นาที) จากจำนวนคำ — ไทย ~350 char/min, EN ~200 คำ/min ──
export function estimateReadMinutes(content: string | null | undefined): number {
  if (!content) return 0
  const text = content.replace(/[#>*`\-\[\]()!]/g, " ")
  const thaiChars = (text.match(/[฀-๿]/g) || []).length
  const words = (text.match(/[A-Za-z0-9]+/g) || []).length
  const mins = thaiChars / 350 + words / 200
  return Math.max(1, Math.ceil(mins))
}
