"use client"
/**
 * ระเบียบข้อบังคับการทำงาน — แสดง PDF จริง (layout เป๊ะ) แบบหนังสือพลิกหน้า
 *   • จัดกลุ่มตามหมวด — ในหมวดเลื่อนดูหลายหน้า, ข้ามหมวด = พลิกหน้า (3D)
 *   • สลับภาษา ไทย / จีน ได้
 *   • หน้าลงนาม (หมวด 10) แปะลายเซ็นผู้บริหารตามบริษัทที่พนักงานสังกัด
 *   • อ่านครบ → ลงลายเซ็นยินยอม (เก็บผ่าน /api/regulations)
 */
import { useState, useMemo, useEffect, useRef, forwardRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import toast from "react-hot-toast"
import {
  ChevronLeft, ChevronRight, BookOpen, List, X, Loader2,
  PenLine, CheckCircle2, ShieldCheck, ArrowLeft, Languages,
} from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import SignaturePad from "@/components/SignaturePad"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import {
  REG_PAGES, REG_TITLES, SIG_POS, pageSrc, execSignatureForCompany,
  type RegLang, type ExecSig,
} from "@/lib/regulations-pages"

const NAVY = "#0f2a4a"
const GOLD = "#b8902f"

type Leaf =
  | { kind: "front"; pages: number[] }
  | { kind: "chapter"; no: number; title: string; pages: number[]; sign: boolean }
  | { kind: "sign" }

const flip = {
  enter: (d: number) => ({ rotateY: d >= 0 ? 40 : -40, x: d >= 0 ? 60 : -60, opacity: 0 }),
  center: { rotateY: 0, x: 0, opacity: 1 },
  exit: (d: number) => ({ rotateY: d >= 0 ? -36 : 36, x: d >= 0 ? -60 : 60, opacity: 0 }),
}

export default function RegulationsReaderPage() {
  const { user } = useAuth()
  const emp = user?.employee as any
  const exec = useMemo<ExecSig | null>(() => execSignatureForCompany(emp?.company), [emp?.company])

  const [lang, setLang] = useState<RegLang>("th")
  const [idx, setIdx] = useState(0)
  const [maxReached, setMaxReached] = useState(0)
  const [dir, setDir] = useState(1)
  const [tocOpen, setTocOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)
  const [ack, setAck] = useState<any>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── สร้าง leaf ตามภาษา (front, ch1..ch10, sign) ──
  const leaves: Leaf[] = useMemo(() => {
    const m = REG_PAGES[lang]
    const out: Leaf[] = [{ kind: "front", pages: m.front }]
    for (const t of REG_TITLES) {
      const pages = m.chapters[t.no] ?? []
      out.push({ kind: "chapter", no: t.no, title: lang === "th" ? t.th : t.cn, pages, sign: pages.includes(m.signPage) })
    }
    out.push({ kind: "sign" })
    return out
  }, [lang])

  const total = leaves.length
  const leaf = leaves[idx]

  useEffect(() => {
    fetch("/api/regulations").then((r) => r.json())
      .then((d) => { setAcknowledged(!!d.acknowledged); setAck(d.ack ?? null) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const go = (next: number) => {
    if (next < 0 || next >= total) return
    setDir(next > idx ? 1 : -1)
    setIdx(next)
    setMaxReached((mx) => Math.max(mx, next))
    setTocOpen(false)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tocOpen) return
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(idx + 1) }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(idx - 1) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [idx, total, tocOpen]) // eslint-disable-line

  const readAll = maxReached >= total - 2   // ถึงหมวดสุดท้าย (ก่อนหน้าลงนาม)

  async function submit() {
    if (!signature) { toast.error("กรุณาลงลายเซ็นก่อน"); return }
    setSubmitting(true)
    try {
      const res = await fetch("/api/regulations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, signed_name: emp ? `${emp.first_name_th ?? ""} ${emp.last_name_th ?? ""}`.trim() : "" }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "บันทึกไม่สำเร็จ"); return }
      toast.success("ลงนามรับทราบเรียบร้อยแล้ว ✓")
      setAcknowledged(true)
      setAck({ signed_name: emp ? `${emp.first_name_th} ${emp.last_name_th}` : "", signature_url: signature, acknowledged_at: new Date().toISOString() })
    } catch { toast.error("เกิดข้อผิดพลาด") } finally { setSubmitting(false) }
  }

  const progress = Math.round((idx / (total - 1)) * 100)

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "radial-gradient(120% 100% at 50% 0%, #14253d 0%, #0a1424 55%, #060d18 100%)" }}>
      {/* ── Top bar ── */}
      <div className="flex items-center gap-2.5 border-b border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
        <Link href="/app/profile" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black text-white">ระเบียบข้อบังคับการทำงาน</p>
          <p className="truncate text-[10px] text-white/50">{emp?.company?.name_th || "SHD Technology"}</p>
        </div>
        {/* สลับภาษา */}
        <button onClick={() => setLang((l) => (l === "th" ? "cn" : "th"))}
          className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-bold text-white/85 transition hover:bg-white/20">
          <Languages size={13} /> {lang === "th" ? "ไทย" : "中文"}
        </button>
        {acknowledged && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
            <CheckCircle2 size={11} /> ลงนามแล้ว
          </span>
        )}
        <button onClick={() => setTocOpen(true)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition">
          <List size={18} />
        </button>
      </div>

      {/* progress */}
      <div className="h-1 w-full bg-white/10">
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${GOLD}, #e6c766)` }} />
      </div>

      {/* ── Book area ── */}
      <div className="relative flex-1 overflow-hidden" style={{ perspective: 2200 }}>
        <button onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="ก่อนหน้า"
          className="absolute left-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 p-2 text-white/80 shadow-lg backdrop-blur transition hover:bg-white/20 disabled:pointer-events-none disabled:opacity-0 md:p-2.5">
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => go(idx + 1)} disabled={idx === total - 1} aria-label="ถัดไป"
          className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 p-2 text-white/80 shadow-lg backdrop-blur transition hover:bg-white/20 disabled:pointer-events-none disabled:opacity-0 md:p-2.5">
          <ChevronRight size={20} />
        </button>

        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div
            key={`${lang}-${idx}`}
            custom={dir}
            variants={flip}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ transformOrigin: dir >= 0 ? "left center" : "right center", transformStyle: "preserve-3d" }}
            className="absolute inset-0"
          >
            <LeafView
              ref={scrollRef}
              leaf={leaf}
              lang={lang}
              exec={exec}
              onSwipe={(dx) => { if (dx < -80) go(idx + 1); else if (dx > 80) go(idx - 1) }}
              signProps={leaf.kind === "sign" ? {
                loading, acknowledged, ack, readAll, emp,
                onSignatureChange: setSignature, onSubmit: submit, submitting, hasSignature: !!signature,
              } : undefined}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom nav ── */}
      <div className="flex items-center gap-3 border-t border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
        <button onClick={() => go(idx - 1)} disabled={idx === 0}
          className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold text-white/80 transition hover:bg-white/20 disabled:opacity-25">
          <ChevronLeft size={16} /> <span className="hidden sm:inline">ก่อนหน้า</span>
        </button>
        <div className="flex-1 text-center">
          <p className="text-[11px] font-bold text-white/85">
            {leaf.kind === "front" && (lang === "th" ? "หน้าปก" : "封面")}
            {leaf.kind === "chapter" && (lang === "th" ? `หมวด ${leaf.no}` : `第 ${leaf.no} 章`)}
            {leaf.kind === "sign" && (lang === "th" ? "ลงนามยินยอม" : "签署确认")}
          </p>
          <p className="text-[10px] text-white/40">{idx + 1} / {total}</p>
        </div>
        <button onClick={() => go(idx + 1)} disabled={idx === total - 1}
          className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-white shadow-md transition active:scale-95 disabled:opacity-25"
          style={{ background: `linear-gradient(135deg, ${NAVY}, #1c476f)` }}>
          <span className="hidden sm:inline">ถัดไป</span> <ChevronRight size={16} />
        </button>
      </div>

      {/* ── TOC drawer ── */}
      <AnimatePresence>
        {tocOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/50" onClick={() => setTocOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="absolute right-0 top-0 z-50 flex h-full w-72 max-w-[82%] flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3" style={{ background: NAVY }}>
                <p className="flex items-center gap-2 font-black text-white"><BookOpen size={16} /> {lang === "th" ? "สารบัญ" : "目录"}</p>
                <button onClick={() => setTocOpen(false)} className="rounded-lg p-1 text-white/80 hover:bg-white/10"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <button onClick={() => go(0)} className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {lang === "th" ? "หน้าปก / สารบัญ" : "封面 / 目录"}
                </button>
                {leaves.map((lf, i) => lf.kind === "chapter" && (
                  <button key={i} onClick={() => go(i)}
                    className={"flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition " + (i === idx ? "bg-slate-100" : "hover:bg-slate-50")}>
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white" style={{ background: i === idx ? GOLD : NAVY }}>{lf.no}</span>
                    <span className="text-[13px] font-medium leading-snug text-slate-700">{lf.title}</span>
                  </button>
                ))}
                <button onClick={() => go(total - 1)}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-50">
                  <PenLine size={14} /> {lang === "th" ? "ลงนามยินยอม" : "签署确认"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── หน้าหนังสือ 1 leaf (เลื่อนดูหลายหน้าในหมวด) ──
const LeafView = forwardRef<HTMLDivElement, {
  leaf: Leaf; lang: RegLang; exec: ExecSig | null
  onSwipe: (dx: number) => void; signProps?: any
}>(function LeafView({ leaf, lang, exec, onSwipe, signProps }, ref) {
  const m = REG_PAGES[lang]
  return (
    <motion.div
      ref={ref as any}
      drag={leaf.kind === "sign" ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={(_, info) => onSwipe(info.offset.x)}
      className="absolute inset-0 overflow-y-auto px-2.5 py-4 md:px-10 md:py-7"
    >
      {leaf.kind === "sign" ? (
        <div className="mx-auto w-full max-w-2xl rounded-md bg-white px-5 py-6 shadow-2xl md:px-10 md:py-9"
          style={{ boxShadow: "0 30px 60px -20px rgba(0,0,0,.55)" }}>
          <Sign {...signProps} />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          {leaf.kind === "chapter" && (
            <div className="flex items-center gap-2 rounded-lg px-1 pb-0.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-black text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${NAVY}, #1c476f)` }}>{leaf.no}</span>
              <p className="text-[13px] font-black text-white/90">{leaf.title}</p>
            </div>
          )}
          {leaf.pages.map((n) => (
            <div key={n} className="relative overflow-hidden rounded-sm bg-white shadow-2xl" style={{ boxShadow: "0 22px 44px -18px rgba(0,0,0,.5)" }}>
              <img src={pageSrc(lang, n)} alt={`หน้า ${n}`} className="block w-full select-none" draggable={false} loading="lazy" />
              {/* แปะลายเซ็นผู้บริหารบนหน้าลงนาม */}
              {n === m.signPage && exec && <ExecOverlay lang={lang} exec={exec} />}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
})

// ── overlay ลายเซ็น + ชื่อกรรมการ (แปะทับช่องในหน้า PDF) ──
function ExecOverlay({ lang, exec }: { lang: RegLang; exec: ExecSig }) {
  const pos = SIG_POS[lang]
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* รูปลายเซ็น */}
      {exec.img && (
        <img src={exec.img} alt="ลายเซ็นผู้บริหาร"
          style={{ position: "absolute", top: `${pos.img.top}%`, left: `${pos.img.left}%`, width: `${pos.img.width}%` }}
          className="object-contain" />
      )}
      {/* ชื่อ (ทับช่อง "( ... )") — พื้นขาวคลุมเต็มแถบ กันชื่อเดิมโผล่ */}
      <div style={{ position: "absolute", top: `${pos.name.top}%`, left: `${pos.name.left}%`, width: `${pos.name.width}%` }}
        className="flex items-center justify-center whitespace-nowrap bg-white py-[0.5em] text-center text-[clamp(8px,1.6vw,13px)] font-medium leading-none text-slate-800">
        ( {exec.name} )
      </div>
    </div>
  )
}

// ── หน้าลงนามพนักงาน ──
function Sign({
  loading, acknowledged, ack, readAll, emp,
  onSignatureChange, onSubmit, submitting, hasSignature,
}: any) {
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>

  if (acknowledged) {
    let dateStr = ""
    try { dateStr = ack?.acknowledged_at ? format(new Date(ack.acknowledged_at), "d MMMM yyyy, HH:mm น.", { locale: th }) : "" } catch {}
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
          <CheckCircle2 size={44} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-black text-slate-800">ลงนามรับทราบแล้ว</h2>
        <p className="mt-1 text-sm text-slate-500">คุณได้ยินยอมและรับทราบระเบียบข้อบังคับนี้เรียบร้อย</p>
        {ack?.signature_url && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <img src={ack.signature_url} alt="ลายเซ็น" className="mx-auto h-28 object-contain" />
            <div className="mt-2 border-t border-slate-100 pt-2"><p className="text-sm font-bold text-slate-700">{ack.signed_name}</p></div>
          </div>
        )}
        {dateStr && <p className="mt-3 text-[12px] text-slate-400">ลงนามเมื่อ {dateStr}</p>}
      </div>
    )
  }

  return (
    <div className="py-1">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${NAVY}, #1c476f)` }}>
          <PenLine size={28} />
        </div>
        <h2 className="text-lg font-black text-slate-800">ลงนามยินยอม</h2>
        <p className="mt-1 max-w-md text-[13px] leading-relaxed text-slate-500">
          ข้าพเจ้าได้อ่านและทำความเข้าใจระเบียบข้อบังคับการทำงานฉบับนี้โดยตลอดแล้ว และยินยอมปฏิบัติตามทุกประการ
        </p>
      </div>

      {!readAll && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-medium text-amber-700">
          <BookOpen size={14} className="shrink-0" /> กรุณาอ่านเอกสารให้ครบทุกหมวดก่อนลงนาม
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-bold text-slate-600">ลายเซ็น</p>
          {emp && <p className="text-[12px] text-slate-400">{emp.first_name_th} {emp.last_name_th}</p>}
        </div>
        <SignaturePad onChange={onSignatureChange} disabled={!readAll} height={190} />
      </div>

      <button onClick={onSubmit} disabled={!readAll || !hasSignature || submitting}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-black text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${NAVY}, #1c476f)` }}>
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
        ยืนยันการลงนาม
      </button>
    </div>
  )
}
