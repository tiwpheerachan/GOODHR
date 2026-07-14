"use client"
/**
 * แอดมิน — ระเบียบข้อบังคับการทำงาน
 *   2 คอลัมน์: รายชื่อพนักงาน (ซ้าย) · รายละเอียด/ลายเซ็น (ขวา)
 *   ดาวน์โหลดเอกสารทั้งฉบับ (เนื้อหาเต็ม + ลายเซ็น) เป็น PDF (print)
 */
import { useEffect, useMemo, useState } from "react"
import {
  ScrollText, Search, CheckCircle2, Clock, Loader2, Download, FileDown,
  Users, PenLine, Building2,
} from "lucide-react"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import reg from "@/lib/regulations-content.json"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Emp = {
  id: string
  employee_code: string | null
  first_name_th: string | null; last_name_th: string | null
  first_name_en: string | null; last_name_en: string | null
  nickname: string | null; nickname_en: string | null
  avatar_url: string | null
  branch: { name: string } | null
  department: { name: string } | null
  ack: { signed_name: string | null; signature_url: string | null; acknowledged_at: string } | null
}

const NAVY = "#0f2a4a"

export default function AdminRegulationsPage() {
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState("")
  const [employees, setEmployees] = useState<Emp[]>([])
  const [filter, setFilter] = useState<"all" | "signed" | "unsigned">("all")
  const [q, setQ] = useState("")
  const [selected, setSelected] = useState<Emp | null>(null)

  useEffect(() => {
    fetch("/api/admin/regulations")
      .then((r) => r.json())
      .then((d) => {
        setVersion(d.version ?? "")
        setEmployees(d.employees ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const signed = employees.filter((e) => e.ack).length
  const total = employees.length
  const pct = total > 0 ? Math.round((signed / total) * 100) : 0

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    return employees.filter((e) => {
      if (filter === "signed" && !e.ack) return false
      if (filter === "unsigned" && e.ack) return false
      if (!kw) return true
      const hay = [
        e.employee_code, e.first_name_th, e.last_name_th, e.first_name_en,
        e.last_name_en, e.nickname, e.branch?.name, e.department?.name,
      ].filter(Boolean).join(" ").toLowerCase()
      return hay.includes(kw)
    })
  }, [employees, filter, q])

  // sync selected object กับข้อมูลล่าสุด
  const selEmp = selected ? employees.find((e) => e.id === selected.id) ?? selected : null

  function exportCsv() {
    const rows = [["รหัส", "ชื่อ", "สาขา", "แผนก", "สถานะ", "ลงนามเมื่อ"]]
    employees.forEach((e) => {
      rows.push([
        e.employee_code ?? "",
        `${e.first_name_th ?? ""} ${e.last_name_th ?? ""}`.trim(),
        e.branch?.name ?? "", e.department?.name ?? "",
        e.ack ? "ลงนามแล้ว" : "ยังไม่ลงนาม",
        e.ack?.acknowledged_at ? fmtDate(e.ack.acknowledged_at) : "",
      ])
    })
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `regulations-signatures-${version}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
  }

  return (
    <div className="w-full">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm" style={{ background: NAVY }}>
            <ScrollText size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">{t("admin.nav.regulations")}</h1>
            <p className="text-xs text-slate-400">ติดตามการลงนามรับทราบ · เวอร์ชัน {version}</p>
          </div>
        </div>
        <button onClick={exportCsv}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <Download size={14} /> ส่งออก CSV
        </button>
      </div>

      {/* stat card */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-slate-500">ความคืบหน้าการลงนาม</p>
            <p className="mt-1 text-3xl font-black text-slate-800">
              {signed}<span className="text-lg font-bold text-slate-400"> / {total} คน</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black" style={{ color: NAVY }}>{pct}%</p>
            <p className="text-[11px] text-slate-400">ลงนามแล้ว</p>
          </div>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: NAVY }} />
        </div>
      </div>

      {/* ── 2 คอลัมน์ ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* ซ้าย: รายชื่อ */}
        <div className="min-w-0 flex-1">
          {/* filters */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {([
              { k: "all", label: "ทั้งหมด", icon: Users, count: total },
              { k: "signed", label: "ลงนามแล้ว", icon: CheckCircle2, count: signed },
              { k: "unsigned", label: "ยังไม่ลงนาม", icon: Clock, count: total - signed },
            ] as const).map((tab) => (
              <button key={tab.k} onClick={() => setFilter(tab.k)}
                className={"flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors " +
                  (filter === tab.k ? "bg-[#0f2a4a] text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50")}>
                <tab.icon size={14} /> {tab.label}
                <span className={"rounded-full px-1.5 text-[11px] " + (filter === tab.k ? "bg-white/25" : "bg-slate-100")}>{tab.count}</span>
              </button>
            ))}
            <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ / รหัส / สาขา"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0f2a4a]" />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">ไม่พบพนักงาน</p>
            ) : (
              <div className="max-h-[62vh] divide-y divide-slate-50 overflow-y-auto">
                {filtered.map((e) => {
                  const active = selEmp?.id === e.id
                  return (
                    <button key={e.id} onClick={() => setSelected(e)}
                      className={"flex w-full items-center gap-3 px-4 py-3 text-left transition-colors " +
                        (active ? "bg-slate-50" : "hover:bg-slate-50/60")}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-black text-slate-500">
                        {e.avatar_url ? <img src={e.avatar_url} alt="" className="h-full w-full object-cover" /> : (e.first_name_th || "?")[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{empName(e as any)}</p>
                        <p className="truncate text-[11px] text-slate-400">
                          {e.employee_code}{e.branch?.name ? ` · ${e.branch.name}` : ""}{e.department?.name ? ` · ${e.department.name}` : ""}
                        </p>
                      </div>
                      {e.ack ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-600">
                          <CheckCircle2 size={13} /> ลงนามแล้ว
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-400">
                          <Clock size={13} /> ยังไม่ลงนาม
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ขวา: รายละเอียด/ลายเซ็น */}
        <div className="w-full lg:sticky lg:top-4 lg:w-[380px] lg:shrink-0">
          <DetailPanel emp={selEmp} version={version} empName={empName} />
        </div>
      </div>
    </div>
  )
}

// ── Detail panel ───────────────────────────────────────────────────
function DetailPanel({ emp, version, empName }: { emp: Emp | null; version: string; empName: (e: any) => string }) {
  if (!emp) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <PenLine size={28} className="mb-3 text-slate-300" />
        <p className="text-sm font-bold text-slate-400">เลือกพนักงานเพื่อดูรายละเอียด</p>
      </div>
    )
  }

  const signed = !!emp.ack
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-base font-black text-slate-500">
          {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="h-full w-full object-cover" /> : (emp.first_name_th || "?")[0]}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-800">{empName(emp as any)}</p>
          <p className="truncate text-[11px] text-slate-400">
            {emp.employee_code}{emp.department?.name ? ` · ${emp.department.name}` : ""}
          </p>
        </div>
      </div>

      {signed ? (
        <div className="p-5">
          {/* หน้าที่เซ็นแล้ว */}
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <div>
              <p className="text-[13px] font-black text-emerald-700">ลงนามรับทราบแล้ว</p>
              <p className="text-[11px] text-emerald-500">เวอร์ชัน {version}</p>
            </div>
          </div>

          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">ลายเซ็นยินยอม</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            {emp.ack?.signature_url
              ? <img src={emp.ack.signature_url} alt="ลายเซ็น" className="mx-auto h-36 object-contain" />
              : <p className="py-8 text-center text-xs text-slate-400">— ไม่มีรูปลายเซ็น —</p>}
            <div className="mt-2 border-t border-slate-200 pt-2 text-center">
              <p className="text-sm font-bold text-slate-700">{emp.ack?.signed_name || empName(emp as any)}</p>
              {emp.ack?.acknowledged_at && (
                <p className="text-[11px] text-slate-400">ลงนามเมื่อ {fmtDate(emp.ack.acknowledged_at)}</p>
              )}
            </div>
          </div>

          <button onClick={() => downloadFullDocument(emp, version, empName)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white shadow-sm transition-all active:scale-[0.98]"
            style={{ background: NAVY }}>
            <FileDown size={16} /> ดาวน์โหลดเอกสารทั้งฉบับ
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-400">เอกสารเต็ม + ลายเซ็น (บันทึกเป็น PDF ได้)</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Clock size={26} className="text-slate-400" />
          </div>
          <p className="text-sm font-black text-slate-600">ยังไม่ได้ลงนาม</p>
          <p className="mt-1 text-[12px] text-slate-400">พนักงานคนนี้ยังไม่ได้อ่านและลงนามรับทราบระเบียบข้อบังคับ</p>
        </div>
      )}
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────
function fmtDate(s: string) {
  try { return format(new Date(s), "d MMM yyyy, HH:mm น.", { locale: th }) } catch { return s }
}

const hasThai = (s: string) => /[฀-๿]/.test(s)
const hasCJK = (s: string) => /[一-鿿]/.test(s)
const isHeading = (s: string) => /^\s*\d+[、.．)]/.test(s) || /^[（(]?\d+[)）]/.test(s)
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// ดาวน์โหลด/พิมพ์เอกสารทั้งฉบับ (เนื้อหาเต็ม + ลายเซ็น)
function downloadFullDocument(emp: Emp, version: string, empName: (e: any) => string) {
  const doc = reg as any as { company: string; title_zh: string; title_th: string; chapters: any[] }
  const logo = `${window.location.origin}/shd-logo.png`

  const chaptersHtml = doc.chapters.filter((c) => c.no > 0).map((c) => `
    <section class="ch">
      <h2><span class="num">${c.no}</span> ${esc(c.title)}</h2>
      ${c.blocks.map((b: string) => {
        if (isHeading(b)) return `<h3>${esc(b)}</h3>`
        if (hasCJK(b) && !hasThai(b)) return `<p class="cjk">${esc(b)}</p>`
        return `<p>${esc(b)}</p>`
      }).join("")}
    </section>`).join("")

  const name = emp.ack?.signed_name || empName(emp as any)
  const dateStr = emp.ack?.acknowledged_at ? fmtDate(emp.ack.acknowledged_at) : ""
  const sigImg = emp.ack?.signature_url ? `<img class="sig" src="${emp.ack.signature_url}"/>` : ""

  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8">
<title>ระเบียบข้อบังคับ - ${esc(name)}</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Sarabun","TH Sarabun New","Noto Sans Thai",-apple-system,sans-serif; color:#0f172a; line-height:1.85; font-size:13px; margin:0; }
  .cover { text-align:center; padding:40px 0 30px; border-bottom:2px solid ${NAVY}; margin-bottom:26px; page-break-after:always; }
  .cover img { height:64px; }
  .cover .zh { font-size:22px; font-weight:800; margin-top:18px; }
  .cover .thai { font-size:19px; font-weight:800; color:${NAVY}; margin-top:4px; }
  .cover .co { color:#64748b; margin-top:14px; font-size:13px; }
  .cover .ver { display:inline-block; margin-top:16px; border:1px solid #cbd5e1; border-radius:999px; padding:3px 14px; font-size:11px; color:#64748b; }
  .ch { margin-bottom:22px; }
  .ch h2 { font-size:16px; font-weight:800; border-bottom:2px solid ${NAVY}; padding-bottom:6px; margin:22px 0 12px; }
  .ch .num { display:inline-flex; width:24px; height:24px; background:${NAVY}; color:#fff; border-radius:6px; align-items:center; justify-content:center; font-size:13px; margin-right:6px; }
  .ch h3 { font-size:14px; font-weight:700; margin:14px 0 4px; }
  .ch p { margin:0 0 8px; text-align:justify; }
  .ch p.cjk { color:#94a3b8; font-size:12px; }
  .signblock { margin-top:30px; border-top:2px solid ${NAVY}; padding-top:20px; page-break-inside:avoid; text-align:center; }
  .signblock h2 { font-size:16px; font-weight:800; }
  .signblock .stmt { max-width:520px; margin:8px auto 18px; color:#475569; }
  .sig { height:120px; object-fit:contain; }
  .signline { border-top:1px solid #94a3b8; width:260px; margin:6px auto 0; padding-top:6px; }
  .signblock .name { font-weight:700; }
  .signblock .date { color:#64748b; font-size:12px; margin-top:2px; }
</style></head><body>
  <div class="cover">
    <img src="${logo}" onerror="this.style.display='none'"/>
    <div class="zh">${esc(doc.title_zh)}</div>
    <div class="thai">${esc(doc.title_th)}</div>
    <div class="co">${esc(doc.company)}</div>
    <div class="ver">เวอร์ชัน ${esc(version)}</div>
  </div>
  ${chaptersHtml}
  <section class="signblock">
    <h2>ลงนามรับทราบและยินยอม</h2>
    <p class="stmt">ข้าพเจ้าได้อ่านและทำความเข้าใจระเบียบข้อบังคับการทำงานฉบับนี้โดยตลอดแล้ว และยินยอมปฏิบัติตามทุกประการ</p>
    ${sigImg}
    <div class="signline">
      <div class="name">${esc(name)}</div>
      ${dateStr ? `<div class="date">ลงนามเมื่อ ${esc(dateStr)}</div>` : ""}
    </div>
  </section>
</body></html>`

  const w = window.open("", "_blank")
  if (!w) return
  w.document.open(); w.document.write(html); w.document.close()
  // รอรูป/ฟอนต์โหลดสักครู่แล้วเปิด print (บันทึกเป็น PDF ได้)
  setTimeout(() => { w.focus(); w.print() }, 600)
}
