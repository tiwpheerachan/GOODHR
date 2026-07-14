"use client"
/**
 * แอดมิน — ระเบียบข้อบังคับการทำงาน
 *   ติดตามว่าพนักงานคนไหนลงนามรับทราบแล้ว / ยังไม่ได้ลงนาม
 */
import { useEffect, useMemo, useState } from "react"
import {
  ScrollText, Search, CheckCircle2, Clock, X, Loader2, Download,
  Users, PenLine,
} from "lucide-react"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
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

export default function AdminRegulationsPage() {
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState("")
  const [employees, setEmployees] = useState<Emp[]>([])
  const [filter, setFilter] = useState<"all" | "signed" | "unsigned">("all")
  const [q, setQ] = useState("")
  const [viewer, setViewer] = useState<Emp | null>(null)

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

  function exportCsv() {
    const rows = [["รหัส", "ชื่อ", "สาขา", "แผนก", "สถานะ", "ลงนามเมื่อ"]]
    employees.forEach((e) => {
      rows.push([
        e.employee_code ?? "",
        `${e.first_name_th ?? ""} ${e.last_name_th ?? ""}`.trim(),
        e.branch?.name ?? "",
        e.department?.name ?? "",
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
    <div className="mx-auto max-w-5xl">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f2a4a] text-white shadow-sm">
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
            <p className="text-4xl font-black text-[#0f2a4a]">{pct}%</p>
            <p className="text-[11px] text-slate-400">ลงนามแล้ว</p>
          </div>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#0f2a4a] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
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

      {/* list */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">ไม่พบพนักงาน</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
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
                  <button onClick={() => setViewer(e)}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-600 hover:bg-emerald-100">
                    <CheckCircle2 size={13} /> ลงนามแล้ว
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-400">
                    <Clock size={13} /> ยังไม่ลงนาม
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* signature viewer */}
      {viewer && viewer.ack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setViewer(null)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3.5 text-white">
              <p className="flex items-center gap-2 font-black"><PenLine size={16} /> ลายเซ็นยินยอม</p>
              <button onClick={() => setViewer(null)} className="rounded p-1 hover:bg-white/20"><X size={18} /></button>
            </div>
            <div className="p-5 text-center">
              <p className="text-sm font-black text-slate-800">{empName(viewer as any)}</p>
              <p className="text-[11px] text-slate-400">{viewer.employee_code}</p>
              {viewer.ack.signature_url && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <img src={viewer.ack.signature_url} alt="ลายเซ็น" className="mx-auto h-32 object-contain" />
                </div>
              )}
              <p className="mt-3 text-[12px] text-slate-500">
                ลงนามเมื่อ {fmtDate(viewer.ack.acknowledged_at)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmtDate(s: string) {
  try { return format(new Date(s), "d MMM yyyy, HH:mm น.", { locale: th }) } catch { return s }
}
