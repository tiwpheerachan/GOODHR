"use client"
import { useEffect, useState, useMemo } from "react"
import { X, Loader2, ChevronDown, ChevronRight, Search, Sparkles, Check, AlertTriangle } from "lucide-react"
import toast from "react-hot-toast"

const ROUND_LABELS: Record<number, string> = { 1: "รอบ 1 (60 วัน)", 2: "รอบ 2 (90 วัน)", 3: "รอบ 3 (119 วัน)" }
const TH_MONTHS = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

const GRADE_COLOR: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700",
  B: "bg-blue-50 text-blue-700",
  C: "bg-amber-50 text-amber-700",
  D: "bg-red-50 text-red-700",
}

export type CopyFromItem = {
  category: string
  description: string
  is_mandatory: boolean
  weight_pct: number
  actual_score: number
  comment: string
}

export type CopySource = {
  id: string
  employee_id: string
  round?: number
  year?: number
  month?: number
  total_score: number
  grade: string
  evaluator_note?: string
  items: Array<{
    category: string
    description: string
    is_mandatory: boolean
    weight_pct: number
    order_no: number
    comment?: string
  }>
  employee?: {
    first_name_th: string
    last_name_th: string
    nickname?: string
    employee_code: string
    avatar_url?: string
    position?: { name: string }
  }
  evaluator?: {
    first_name_th: string
    last_name_th: string
  }
}

type Sources = {
  same_employee: CopySource[]
  team: CopySource[]
}

type Props = {
  /** Type of evaluation — drives label + endpoint */
  mode: "probation" | "kpi"
  /** Employee being evaluated */
  forEmployeeId: string
  /** Current round (probation) or year/month (kpi) — used to skip the same form */
  forRound?: number
  forYear?: number
  forMonth?: number
  /** Whether the current form has unsaved data */
  hasExistingData: boolean
  /** Called with copied items + (optional) evaluator_note when user confirms */
  onApply: (items: CopyFromItem[], evaluatorNote: string | null) => void
  /** Close handler */
  onClose: () => void
}

function sourceLabel(s: CopySource, mode: "probation" | "kpi"): string {
  if (mode === "probation") return ROUND_LABELS[s.round ?? 0] || `รอบ ${s.round}`
  return `${TH_MONTHS[s.month ?? 0]} ${s.year}`
}

function sortKey(s: CopySource, mode: "probation" | "kpi"): number {
  if (mode === "probation") return -(s.round ?? 0) // descending round
  return -((s.year ?? 0) * 100 + (s.month ?? 0))
}

export default function CopyFromPicker({
  mode, forEmployeeId, forRound, forYear, forMonth,
  hasExistingData, onApply, onClose,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [sources, setSources] = useState<Sources>({ same_employee: [], team: [] })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [copyComments, setCopyComments] = useState(false)
  const [copyEvaluatorNote, setCopyEvaluatorNote] = useState(false)
  const [activeTab, setActiveTab] = useState<"same" | "team">("same")
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)

  // Fetch sources
  useEffect(() => {
    const ctrl = new AbortController()
    const url = new URL(
      mode === "probation" ? "/api/probation-evaluation" : "/api/kpi",
      window.location.origin,
    )
    url.searchParams.set("mode", "copy_sources")
    url.searchParams.set("for_employee_id", forEmployeeId)
    if (mode === "probation" && forRound) url.searchParams.set("for_round", String(forRound))
    if (mode === "kpi") {
      if (forYear) url.searchParams.set("for_year", String(forYear))
      if (forMonth) url.searchParams.set("for_month", String(forMonth))
    }

    setLoading(true)
    fetch(url.toString(), { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        if (data.error) { toast.error(data.error); return }
        const safe = {
          same_employee: data.same_employee ?? [],
          team: data.team ?? [],
        }
        safe.same_employee.sort((a: CopySource, b: CopySource) => sortKey(a, mode) - sortKey(b, mode))
        safe.team.sort((a: CopySource, b: CopySource) => sortKey(a, mode) - sortKey(b, mode))
        setSources(safe)

        // Auto-select smartest default + tab
        if (safe.same_employee.length > 0) {
          setSelectedId(safe.same_employee[0].id)
          setActiveTab("same")
        } else if (safe.team.length > 0) {
          setSelectedId(safe.team[0].id)
          setActiveTab("team")
        }
      })
      .catch(err => { if (err.name !== "AbortError") toast.error("โหลดแม่แบบไม่สำเร็จ") })
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [mode, forEmployeeId, forRound, forYear, forMonth])

  const visible: CopySource[] = useMemo(() => {
    const list = activeTab === "same" ? sources.same_employee : sources.team
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(s => {
      const e = s.employee
      const n = `${e?.first_name_th ?? ""} ${e?.last_name_th ?? ""} ${e?.nickname ?? ""} ${e?.employee_code ?? ""}`.toLowerCase()
      return n.includes(q) || (e?.position?.name ?? "").toLowerCase().includes(q)
    })
  }, [sources, activeTab, search])

  const selected = useMemo(() => {
    const all = [...sources.same_employee, ...sources.team]
    return all.find(s => s.id === selectedId) ?? null
  }, [sources, selectedId])

  const totalCount = sources.same_employee.length + sources.team.length

  function handleApplyClick() {
    if (!selected) { toast.error("กรุณาเลือกแม่แบบ"); return }
    if (hasExistingData && !confirmOverwrite) { setConfirmOverwrite(true); return }
    doApply()
  }

  function doApply() {
    if (!selected) return
    // Build items — copy structure but reset scores; comments opt-in
    const items: CopyFromItem[] = (selected.items ?? [])
      .slice()
      .sort((a, b) => a.order_no - b.order_no)
      .map(it => ({
        category: it.category ?? "",
        description: it.description ?? "",
        is_mandatory: !!it.is_mandatory,
        weight_pct: Number(it.weight_pct) || 0,
        actual_score: 0,
        comment: copyComments ? (it.comment ?? "") : "",
      }))
    const note = copyEvaluatorNote ? (selected.evaluator_note ?? "") : null
    onApply(items, note)
    toast.success(`นำหัวข้อจาก ${describeSource(selected, mode)} มาแล้ว ${items.length} หัวข้อ`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-500" />
              <h3 className="text-lg font-black text-slate-800">เริ่มจากแม่แบบ</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-slate-400">เลือกฟอร์มที่เคยประเมิน — หัวข้อ/น้ำหนักจะถูกคัดลอกมา ส่วนคะแนนเริ่มจาก 0</p>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3">
          <div className="flex bg-slate-100 rounded-xl p-1 text-xs font-bold">
            <TabButton active={activeTab === "same"} onClick={() => setActiveTab("same")} disabled={!sources.same_employee.length}>
              คนนี้ก่อนหน้า ({sources.same_employee.length})
            </TabButton>
            <TabButton active={activeTab === "team"} onClick={() => setActiveTab("team")} disabled={!sources.team.length}>
              ลูกน้องของฉัน ({sources.team.length})
            </TabButton>
          </div>
        </div>

        {/* Search */}
        {activeTab === "team" && (
          <div className="px-5 pt-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ / รหัส / ตำแหน่ง"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-indigo-400"
              />
            </div>
          </div>
        )}

        {/* Body — list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
          ) : totalCount === 0 ? (
            <EmptyHint mode={mode} />
          ) : visible.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">ไม่พบในแถบนี้</p>
          ) : visible.map(s => (
            <SourceRow
              key={s.id}
              source={s}
              mode={mode}
              showEmployee={activeTab !== "same"}
              selected={selectedId === s.id}
              previewing={previewId === s.id}
              onSelect={() => setSelectedId(s.id)}
              onTogglePreview={() => setPreviewId(previewId === s.id ? null : s.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={copyComments} onChange={e => setCopyComments(e.target.checked)} className="accent-indigo-600" />
            คัดลอก comment ของแต่ละหัวข้อด้วย
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={copyEvaluatorNote} onChange={e => setCopyEvaluatorNote(e.target.checked)} className="accent-indigo-600" />
            คัดลอก ความเห็นภาพรวม
          </label>

          {confirmOverwrite && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">ฟอร์มมีข้อมูลอยู่แล้ว — จะถูกทับ</p>
                <p>กดยืนยันอีกครั้งเพื่อใช้แม่แบบนี้</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50">
              ยกเลิก
            </button>
            <button
              onClick={handleApplyClick}
              disabled={!selected || loading}
              className="flex-[1.5] py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Check size={14} />
              {confirmOverwrite ? "ยืนยันทับของเดิม" : "นำมาใช้"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────

function describeSource(s: CopySource, mode: "probation" | "kpi"): string {
  const who = s.employee ? `${s.employee.first_name_th} ${s.employee.last_name_th}` : ""
  return `${who} — ${sourceLabel(s, mode)}`
}

function TabButton({ active, onClick, disabled, children }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-1.5 rounded-lg transition-all whitespace-nowrap ${
        active ? "bg-white shadow text-indigo-600" : "text-slate-500 disabled:opacity-40"
      }`}
    >
      {children}
    </button>
  )
}

function EmptyHint({ mode }: { mode: "probation" | "kpi" }) {
  return (
    <div className="text-center py-10 px-4">
      <Sparkles size={28} className="mx-auto text-slate-200 mb-2" />
      <p className="text-sm text-slate-500 font-bold">ยังไม่มีฟอร์มเก่าที่จะคัดลอก</p>
      <p className="text-xs text-slate-400 mt-1">
        {mode === "probation"
          ? "ฟอร์มประเมินทดลองงานก่อนหน้านี้ของลูกน้องคุณจะปรากฏที่นี่"
          : "ฟอร์ม KPI ก่อนหน้านี้ของลูกน้องคุณจะปรากฏที่นี่"}
      </p>
    </div>
  )
}

function SourceRow({ source, mode, showEmployee, selected, previewing, onSelect, onTogglePreview }: {
  source: CopySource
  mode: "probation" | "kpi"
  showEmployee: boolean
  selected: boolean
  previewing: boolean
  onSelect: () => void
  onTogglePreview: () => void
}) {
  const e = source.employee
  const gColor = GRADE_COLOR[source.grade] ?? "bg-slate-100 text-slate-600"
  const initials = e?.first_name_th?.[0] ?? "?"
  return (
    <div className={`rounded-xl border transition-all ${selected ? "border-indigo-400 bg-indigo-50/40" : "border-slate-200 bg-white"}`}>
      <button onClick={onSelect} className="w-full text-left px-3 py-2.5 flex items-center gap-3">
        <input type="radio" checked={selected} onChange={onSelect} className="accent-indigo-600 shrink-0" />
        {showEmployee && e && (
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 overflow-hidden">
            {e.avatar_url ? <img src={e.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-rose-600 font-bold text-sm">{initials}</span>}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {showEmployee && e ? (
            <p className="text-sm font-bold text-slate-800 truncate">{e.first_name_th} {e.last_name_th} <span className="text-slate-400 text-[11px] font-normal">{e.position?.name ?? ""}</span></p>
          ) : (
            <p className="text-sm font-bold text-slate-800">{sourceLabel(source, mode)}</p>
          )}
          <p className="text-[11px] text-slate-400 truncate">
            {showEmployee && <span>{sourceLabel(source, mode)} · </span>}
            {(source.items?.length ?? 0)} หัวข้อ
            {source.evaluator && (
              <span className="ml-1">· ประเมินโดย {source.evaluator.first_name_th} {source.evaluator.last_name_th}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-bold text-slate-700">{Number(source.total_score).toFixed(0)}%</span>
          <span className={`w-6 h-6 rounded-md text-[10px] font-black flex items-center justify-center ${gColor}`}>{source.grade}</span>
        </div>
      </button>
      <button
        onClick={onTogglePreview}
        className="w-full px-3 py-1.5 text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 border-t border-slate-100"
      >
        {previewing ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {previewing ? "ซ่อนรายการหัวข้อ" : "ดูรายการหัวข้อ"}
      </button>
      {previewing && (
        <div className="px-3 pb-3 space-y-1">
          {(source.items ?? []).map((it, idx) => (
            <div key={idx} className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 w-4">{idx + 1}.</span>
              <span className="text-xs text-slate-700 flex-1 truncate">{it.category}</span>
              <span className="text-[10px] text-slate-500 font-bold">{it.weight_pct}%</span>
              {it.is_mandatory && <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">บังคับ</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
