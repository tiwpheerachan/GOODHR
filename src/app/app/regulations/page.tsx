"use client"
/**
 * ระเบียบข้อบังคับการทำงาน — โหมดอ่านแบบ e-book (พลิกหน้าเหมือนหนังสือ)
 *   อ่านจนจบ → หน้าสุดท้ายเซ็นลายเซ็นยินยอม
 *   ถ้าเซ็นแล้ว → แสดงสถานะ + ลายเซ็นเดิม
 *   ดีไซน์ทางการ พื้นหลังขาว · เลื่อนหน้าได้ทั้งปัด (มือถือ) / ปุ่มลูกศร / คีย์บอร์ด ← →
 */
import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import toast from "react-hot-toast"
import {
  ChevronLeft, ChevronRight, BookOpen, List, X, Loader2,
  PenLine, CheckCircle2, ShieldCheck, ArrowLeft,
} from "lucide-react"
import reg from "@/lib/regulations-content.json"
import { useAuth } from "@/lib/hooks/useAuth"
import SignaturePad from "@/components/SignaturePad"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const NAVY = "#0f2a4a"

const hasThai = (s: string) => /[฀-๿]/.test(s)
const hasCJK = (s: string) => /[一-鿿]/.test(s)
const isHeading = (s: string) => /^\s*\d+[、.．)]/.test(s) || /^[（(]?\d+[)）]/.test(s)

// ── ลายเซ็นผู้บริหาร (ท้ายหมวด 10) — แสดงตามบริษัท/เครือที่พนักงานสังกัด ──
type Sig = { src: string; company: string; name: string }
const SIG_SHD: Sig = { src: "/regulations-sig/sig-shd.png", company: "SHD Technology", name: "May" }
const SIG_RABBIT: Sig = { src: "/regulations-sig/sig-rabbit.jpg", company: "Rabbit + TopOne", name: "Winai" }
const SIG_HASHTAG: Sig = { src: "/regulations-sig/sig-hashtag.png", company: "Hashtag", name: "JBC" }
const SIG_PTC: Sig = { src: "/regulations-sig/sig-ptc.jpg", company: "PTC Distribution", name: "" }
// map บริษัทของพนักงาน → ลายเซ็นเครือนั้น (SHD / Rabbit+TopOne / Hashtag / PTC)
function signatureForCompany(company: any): Sig | null {
  const code = (company?.code || "").toUpperCase()
  const name = `${company?.name_th || ""} ${company?.name_en || ""}`.toLowerCase()
  if (code === "SHD" || /shd|เอสเอชดี/.test(name)) return SIG_SHD
  if (code === "HASHTAG" || /hashtag|แฮชแท็ก/.test(name)) return SIG_HASHTAG
  if (["RABBIT", "TOP1"].includes(code) || /rabbit|แรบบิท|top\s?one|ท็อป\s?วัน/.test(name)) return SIG_RABBIT
  if (code === "PTC" || /\bptc\b|พี\s?ที\s?ซี|pct/.test(name)) return SIG_PTC
  return null
}
// ช่องสำหรับใส่ลายเซ็น (เช่น "(Signature )" หรือ "(        )")
const isSigSlot = (s: string) => /^\(\s*signature\s*\)$/i.test(s.trim()) || /^\(\s+\)$/.test(s.trim())

// ── โลโก้ SHD (ทางการ) — ใช้ไฟล์ public/shd-logo.png ; fallback = ตราตัวอักษร ──
function ShdLogo({ h = 48, square = false }: { h?: number; square?: boolean }) {
  const [err, setErr] = useState(false)
  if (err) {
    return (
      <div
        style={{ width: h, height: h, background: NAVY }}
        className="flex items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-black/5"
      >
        <span className="font-black leading-none tracking-tight" style={{ fontSize: h * 0.3 }}>SHD</span>
      </div>
    )
  }
  return (
    <img
      src="/shd-logo.png"
      alt="SHD Technology Co., Ltd."
      style={{ height: h, ...(square ? { width: h } : {}) }}
      className={"w-auto object-contain" + (square ? " rounded-lg" : "")}
      onError={() => setErr(true)}
    />
  )
}

type Chapter = { no: number; head: string; title: string; blocks: string[] }
type Page =
  | { kind: "cover" }
  | { kind: "content"; chapterNo: number; head: string; title: string; blocks: string[] }
  | { kind: "sign" }

export default function RegulationsReaderPage() {
  const { user } = useAuth()
  const emp = user?.employee as any
  const doc = reg as any as { version: string; company: string; title_zh: string; title_th: string; chapters: Chapter[] }

  const [idx, setIdx] = useState(0)
  const [maxReached, setMaxReached] = useState(0)
  const [dir, setDir] = useState(1)
  const [tocOpen, setTocOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)
  const [ack, setAck] = useState<any>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── สร้างหน้าจากเนื้อหา ─────────────────────────────────────────
  // หนึ่งหมวด = หนึ่งหน้า (เลื่อนอ่านต่อเนื่อง ไม่ซอยย่อย)
  const pages: Page[] = useMemo(() => {
    const out: Page[] = [{ kind: "cover" }]
    for (const ch of doc.chapters) {
      if (ch.no === 0) continue
      out.push({ kind: "content", chapterNo: ch.no, head: ch.head, title: ch.title, blocks: ch.blocks })
    }
    out.push({ kind: "sign" })
    return out
  }, [doc])

  const total = pages.length
  const page = pages[idx]

  const chapterStart = useMemo(() => {
    const m = new Map<number, number>()
    pages.forEach((p, i) => {
      if (p.kind === "content") m.set(p.chapterNo, i)
    })
    return m
  }, [pages])

  useEffect(() => {
    fetch("/api/regulations")
      .then((r) => r.json())
      .then((d) => {
        setAcknowledged(!!d.acknowledged)
        setAck(d.ack ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const go = (next: number) => {
    if (next < 0 || next >= total) return
    setDir(next > idx ? 1 : -1)
    setIdx(next)
    setMaxReached((m) => Math.max(m, next))
    setTocOpen(false)
  }

  // ── คีย์บอร์ด ← → (เดสก์ท็อป) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tocOpen) return
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(idx + 1) }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(idx - 1) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [idx, total, tocOpen]) // eslint-disable-line

  const readAll = maxReached >= total - 1

  async function submit() {
    if (!signature) { toast.error("กรุณาลงลายเซ็นก่อน"); return }
    setSubmitting(true)
    try {
      const res = await fetch("/api/regulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature,
          signed_name: emp ? `${emp.first_name_th ?? ""} ${emp.last_name_th ?? ""}`.trim() : "",
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "บันทึกไม่สำเร็จ"); return }
      toast.success("ลงนามรับทราบเรียบร้อยแล้ว ✓")
      setAcknowledged(true)
      setAck({ signed_name: emp ? `${emp.first_name_th} ${emp.last_name_th}` : "", signature_url: signature, acknowledged_at: new Date().toISOString() })
    } catch {
      toast.error("เกิดข้อผิดพลาด")
    } finally {
      setSubmitting(false)
    }
  }

  const progress = Math.round((idx / (total - 1)) * 100)

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-3 py-2.5">
        <Link href="/app/profile" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <ArrowLeft size={18} />
        </Link>
        <ShdLogo h={26} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black text-slate-800">ระเบียบข้อบังคับการทำงาน</p>
          <p className="truncate text-[10px] text-slate-400">{doc.company}</p>
        </div>
        {acknowledged && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 size={11} /> ลงนามแล้ว
          </span>
        )}
        <button onClick={() => setTocOpen(true)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <List size={18} />
        </button>
      </div>

      {/* progress */}
      <div className="h-1 w-full bg-slate-200">
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: NAVY }} />
      </div>

      {/* ── Book area ───────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        {/* side nav arrows (เดสก์ท็อป) */}
        <button
          onClick={() => go(idx - 1)} disabled={idx === 0}
          aria-label="หน้าก่อนหน้า"
          className="absolute left-1.5 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 p-2 text-slate-600 shadow-md transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 md:p-2.5"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => go(idx + 1)} disabled={idx === total - 1}
          aria-label="หน้าถัดไป"
          className="absolute right-1.5 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 p-2 text-slate-600 shadow-md transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 md:p-2.5"
        >
          <ChevronRight size={20} />
        </button>

        <AnimatePresence mode="popLayout" custom={dir}>
          <motion.div
            key={idx}
            custom={dir}
            initial={{ opacity: 0, x: dir * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -50 }}
            transition={{ duration: 0.26, ease: "easeInOut" }}
            drag={page.kind === "sign" ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) go(idx + 1)
              else if (info.offset.x > 80) go(idx - 1)
            }}
            className="absolute inset-0 overflow-y-auto px-3 py-4 md:px-14 md:py-6"
          >
            {/* หน้ากระดาษ */}
            <div className="mx-auto min-h-full max-w-3xl rounded-lg border border-slate-200 bg-white px-5 py-6 shadow-sm md:px-10 md:py-9">
              {page.kind === "cover" && <Cover doc={doc} />}
              {page.kind === "content" && <Content page={page} signature={signatureForCompany(emp?.company)} />}
              {page.kind === "sign" && (
                <Sign
                  loading={loading}
                  acknowledged={acknowledged}
                  ack={ack}
                  readAll={readAll}
                  emp={emp}
                  onSignatureChange={setSignature}
                  onSubmit={submit}
                  submitting={submitting}
                  hasSignature={!!signature}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom nav ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-2.5">
        <button
          onClick={() => go(idx - 1)} disabled={idx === 0}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-30"
        >
          <ChevronLeft size={16} /> <span className="hidden sm:inline">ก่อนหน้า</span>
        </button>
        <div className="flex-1 text-center">
          <p className="text-[11px] font-bold text-slate-600">
            {page.kind === "cover" && "หน้าปก"}
            {page.kind === "content" && `หมวด ${page.chapterNo}`}
            {page.kind === "sign" && "ลงนามยินยอม"}
          </p>
          <p className="text-[10px] text-slate-400">{idx + 1} / {total}</p>
        </div>
        <button
          onClick={() => go(idx + 1)} disabled={idx === total - 1}
          className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-white disabled:opacity-30"
          style={{ background: NAVY }}
        >
          <span className="hidden sm:inline">ถัดไป</span> <ChevronRight size={16} />
        </button>
      </div>

      {/* ── TOC drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {tocOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/40" onClick={() => setTocOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="absolute right-0 top-0 z-50 flex h-full w-72 max-w-[82%] flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="flex items-center gap-2 font-black text-slate-800"><BookOpen size={16} /> สารบัญ</p>
                <button onClick={() => setTocOpen(false)} className="rounded-lg p-1 hover:bg-slate-100"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <button onClick={() => go(0)} className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  หน้าปก
                </button>
                {doc.chapters.filter((c) => c.no > 0).map((c) => (
                  <button key={c.no} onClick={() => go(chapterStart.get(c.no) ?? 0)}
                    className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white" style={{ background: NAVY }}>{c.no}</span>
                    <span className="text-[13px] font-medium leading-snug text-slate-700">{c.title}</span>
                  </button>
                ))}
                <button onClick={() => go(total - 1)}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-50">
                  <PenLine size={14} /> ลงนามยินยอม
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Cover ──────────────────────────────────────────────────────────
function Cover({ doc }: { doc: any }) {
  const cover = (doc.chapters as Chapter[]).find((c) => c.no === 0)
  return (
    <div className="flex min-h-full flex-col items-center justify-center py-6 text-center">
      <ShdLogo h={56} />
      <div className="mt-6 h-px w-16 bg-slate-300" />
      <p className="mt-5 text-2xl font-black tracking-tight text-slate-800">{doc.title_zh}</p>
      <h1 className="mt-1 text-xl font-black" style={{ color: NAVY }}>{doc.title_th}</h1>
      <div className="mt-6 space-y-1.5 text-[13px] leading-relaxed text-slate-600">
        {(cover?.blocks ?? []).map((b, i) => (
          <p key={i} className={hasCJK(b) && !hasThai(b) ? "text-slate-400" : "font-medium text-slate-700"}>{b}</p>
        ))}
      </div>
      <div className="mt-7 h-px w-16 bg-slate-300" />
      <p className="mt-5 rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-[11px] font-bold text-slate-500">
        เวอร์ชัน {doc.version}
      </p>
      <p className="mt-6 flex items-center gap-1.5 text-[12px] text-slate-400">
        กดลูกศร <ChevronRight size={13} /> หรือปัดเพื่ออ่านต่อ
      </p>
    </div>
  )
}

// ── Content page (หนึ่งหมวด เรียงต่อเนื่อง) ──────────────────────────
function Content({ page, signature }: { page: Extract<Page, { kind: "content" }>; signature: Sig | null }) {
  return (
    <article>
      {/* หัวหมวด */}
      <header className="mb-6 flex items-start gap-3 border-b-2 pb-4" style={{ borderColor: NAVY }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-black text-white shadow-sm" style={{ background: NAVY }}>
          {page.chapterNo}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{page.head}</p>
          <h2 className="mt-0.5 text-lg font-black leading-snug text-slate-800">{page.title}</h2>
        </div>
      </header>

      {/* เนื้อหา */}
      <div>
        {page.blocks.map((b, i) => {
          // ช่องลายเซ็นในหมวด 10 → แสดงลายเซ็นผู้บริหาร 3 บริษัท
          if (page.chapterNo === 10 && isSigSlot(b)) {
            return <SignatureRow key={i} sig={signature} />
          }
          const cjkOnly = hasCJK(b) && !hasThai(b)
          const heading = isHeading(b)
          if (heading) {
            return (
              <h3 key={i} className={(i > 0 ? "mt-7 " : "") + "mb-2 text-[15px] font-bold leading-snug text-slate-900"}>
                {b}
              </h3>
            )
          }
          if (cjkOnly) {
            return (
              <p key={i} className="mb-1.5 text-[12.5px] leading-relaxed text-slate-400">
                {b}
              </p>
            )
          }
          return (
            <p key={i} className="mb-4 text-justify indent-6 text-[14px] leading-[1.95] text-slate-700">
              {b}
            </p>
          )
        })}
      </div>
    </article>
  )
}

// ── ลายเซ็นผู้บริหาร (หมวด 10) — เฉพาะเครือที่พนักงานสังกัด ──
function SignatureRow({ sig }: { sig: Sig | null }) {
  if (!sig) {
    // บริษัทยังไม่ได้ map ลายเซ็น → เว้นช่องว่างไว้
    return <div className="my-2 h-16 w-56 border-b border-slate-300" />
  }
  return (
    <div className="my-3 flex flex-col items-center text-center sm:items-start">
      <img src={sig.src} alt={`ลายเซ็น ${sig.company}`} className="h-20 w-auto max-w-[220px] object-contain" />
      <div className="mt-1 w-56 border-t border-slate-300 pt-1.5">
        <p className="text-[13px] font-bold text-slate-700">{sig.company}</p>
        {sig.name && <p className="text-[11px] text-slate-400">{sig.name}</p>}
      </div>
    </div>
  )
}

// ── Sign page ──────────────────────────────────────────────────────
function Sign({
  loading, acknowledged, ack, readAll, emp,
  onSignatureChange, onSubmit, submitting, hasSignature,
}: {
  loading: boolean; acknowledged: boolean; ack: any; readAll: boolean; emp: any
  onSignatureChange: (d: string | null) => void; onSubmit: () => void; submitting: boolean; hasSignature: boolean
}) {
  if (loading) {
    return <div className="flex min-h-full items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
  }

  if (acknowledged) {
    let dateStr = ""
    try { dateStr = ack?.acknowledged_at ? format(new Date(ack.acknowledged_at), "d MMMM yyyy, HH:mm น.", { locale: th }) : "" } catch {}
    return (
      <div className="flex min-h-full flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
          <CheckCircle2 size={44} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-black text-slate-800">ลงนามรับทราบแล้ว</h2>
        <p className="mt-1 text-sm text-slate-500">คุณได้ยินยอมและรับทราบระเบียบข้อบังคับนี้เรียบร้อย</p>
        {ack?.signature_url && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <img src={ack.signature_url} alt="ลายเซ็น" className="mx-auto h-28 object-contain" />
            <div className="mt-2 border-t border-slate-100 pt-2">
              <p className="text-sm font-bold text-slate-700">{ack.signed_name}</p>
            </div>
          </div>
        )}
        {dateStr && <p className="mt-3 text-[12px] text-slate-400">ลงนามเมื่อ {dateStr}</p>}
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: NAVY }}>
          <PenLine size={28} />
        </div>
        <h2 className="text-lg font-black text-slate-800">ลงนามยินยอม</h2>
        <p className="mt-1 max-w-md text-[13px] leading-relaxed text-slate-500">
          ข้าพเจ้าได้อ่านและทำความเข้าใจระเบียบข้อบังคับการทำงานฉบับนี้โดยตลอดแล้ว
          และยินยอมปฏิบัติตามทุกประการ
        </p>
      </div>

      {!readAll && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-medium text-amber-700">
          <BookOpen size={14} className="shrink-0" />
          กรุณาอ่านเอกสารให้ครบทุกหน้าก่อนลงนาม
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-bold text-slate-600">ลายเซ็น</p>
          {emp && <p className="text-[12px] text-slate-400">{emp.first_name_th} {emp.last_name_th}</p>}
        </div>
        <SignaturePad onChange={onSignatureChange} disabled={!readAll} height={190} />
      </div>

      <button
        onClick={onSubmit}
        disabled={!readAll || !hasSignature || submitting}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-black text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: NAVY }}
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
        ยืนยันการลงนาม
      </button>
    </div>
  )
}
