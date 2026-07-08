"use client"
import { useEffect, useState } from "react"
import { Shield, Plus, X, Loader2, UserCheck, CheckCircle2, Clock, FilePlus2, AlertCircle, CalendarClock } from "lucide-react"
import toast from "react-hot-toast"

type Assignment = {
  id: string
  round: number
  label?: string | null
  due_days?: number | null
  evaluator_id: string
  evaluator?: { first_name_th: string; last_name_th: string; nickname?: string; employee_code: string; avatar_url?: string }
  form?: { id: string; status: string; grade?: string; total_score?: number; is_passed?: boolean } | null
}

// รอบมาตรฐาน + กำหนดเอง (99)
const ROUND_OPTS: { v: number; l: string }[] = [
  { v: 1, l: "รอบที่ 1 (45 วัน)" },
  { v: 2, l: "รอบที่ 2 (90 วัน)" },
  { v: 99, l: "กำหนดเอง" },
]

function roundText(a: Assignment) {
  if (a.round === 99) return a.label || "รอบกำหนดเอง"
  return ROUND_OPTS.find(r => r.v === a.round)?.l || `รอบ ${a.round}`
}

function statusMeta(f: Assignment["form"]) {
  if (!f) return { l: "ยังไม่ประเมิน", c: "bg-slate-100 text-slate-500", I: FilePlus2 }
  if (f.status === "approved") return { l: `อนุมัติ · ${f.grade ?? ""}`, c: "bg-emerald-50 text-emerald-700", I: CheckCircle2 }
  if (f.status === "submitted") return { l: "รอ HR อนุมัติ", c: "bg-orange-50 text-orange-700", I: Clock }
  if (f.status === "rejected") return { l: "ส่งคืนแก้ไข", c: "bg-red-50 text-red-600", I: AlertCircle }
  return { l: "ร่าง", c: "bg-amber-50 text-amber-700", I: Clock }
}

export default function ProbationAssignmentsSection({
  employeeId, allEmps, loadAllEmps,
}: {
  employeeId: string
  allEmps: any[]
  loadAllEmps: () => void
}) {
  const [list, setList] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState("")
  const [pickEvalId, setPickEvalId] = useState<string | null>(null)
  const [round, setRound] = useState<number>(2)
  const [customLabel, setCustomLabel] = useState("")
  const [customDays, setCustomDays] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/probation-evaluation/assignments?employee_id=${employeeId}`)
      const data = await res.json()
      setList(data.assignments ?? [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [employeeId])

  async function handleAdd() {
    if (!pickEvalId) { toast.error("กรุณาเลือกผู้ประเมิน"); return }
    if (round === 99 && (!customLabel.trim() || !Number(customDays))) { toast.error("กรอกชื่อรอบและจำนวนวันของรอบกำหนดเอง"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/probation-evaluation/assignments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId, evaluator_id: pickEvalId, round,
          label: round === 99 ? customLabel.trim() : undefined,
          due_days: round === 99 ? Number(customDays) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "เพิ่มไม่สำเร็จ")
      toast.success("เพิ่มผู้ประเมินแล้ว")
      setShowAdd(false); setPickEvalId(null); setSearch(""); setRound(2); setCustomLabel(""); setCustomDays("")
      load()
    } catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }

  async function handleRemove(id: string) {
    if (!confirm("ลบการมอบหมายนี้?")) return
    try {
      const res = await fetch(`/api/probation-evaluation/assignments?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "ลบไม่สำเร็จ")
      toast.success("ลบแล้ว")
      load()
    } catch (e: any) { toast.error(e.message) }
  }

  const filtered = allEmps.filter(e => {
    if (e.id === employeeId) return false
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return `${e.first_name_th} ${e.last_name_th} ${e.employee_code} ${e.nickname ?? ""}`.toLowerCase().includes(s)
  })
  const pickEmp = allEmps.find(e => e.id === pickEvalId)

  return (
    <div className="mt-6 p-4 rounded-2xl border-2 border-violet-100 bg-violet-50/40">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Shield size={14} className="text-violet-500"/>
          มอบหมายประเมินทดลองงาน (หลายคน/หลายรอบ)
          {list.length > 0 && <span className="text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">{list.length}</span>}
        </h4>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); loadAllEmps() }}
            className="flex items-center gap-1 text-xs font-bold text-violet-600 bg-white border border-violet-200 rounded-lg px-2.5 py-1.5 hover:bg-violet-50">
            <Plus size={12}/> เพิ่ม
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-3">กำหนดผู้ประเมินเพิ่มเติมได้ไม่จำกัด — เลือกรอบ (45/90 หรือกำหนดเอง) และผู้ประเมิน (ใครก็ได้) · แต่ละใบแยกอิสระ HR เห็นทุกใบ</p>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-slate-300"/></div>
      ) : list.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">ยังไม่มี — กด &quot;เพิ่ม&quot; เพื่อมอบหมายผู้ประเมิน</p>
      ) : (
        <div className="space-y-2 mb-3">
          {list.map(a => {
            const st = statusMeta(a.form)
            const Icon = st.I
            const e = a.evaluator
            return (
              <div key={a.id} className="bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {e?.avatar_url ? <img src={e.avatar_url} alt="" className="w-full h-full object-cover"/> : <span className="text-violet-600 font-bold text-sm">{e?.first_name_th?.[0] ?? "?"}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1">
                    <UserCheck size={12} className="text-violet-400 shrink-0"/> {e?.first_name_th} {e?.last_name_th}
                    {e?.nickname && <span className="text-xs text-violet-500 font-normal">({e.nickname})</span>}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                    <span className="font-bold text-violet-600">{roundText(a)}</span>
                    {a.round === 99 && a.due_days && <span className="flex items-center gap-0.5"><CalendarClock size={9}/> {a.due_days} วัน</span>}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0 ${st.c}`}>
                  <Icon size={10}/> {st.l}
                </span>
                <button onClick={() => handleRemove(a.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center shrink-0">
                  <X size={13} className="text-slate-400 hover:text-red-500"/>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-violet-200 p-3 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">มอบหมายผู้ประเมิน</p>
            <button onClick={() => { setShowAdd(false); setPickEvalId(null); setSearch("") }} className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center">
              <X size={11} className="text-slate-400"/>
            </button>
          </div>

          {/* รอบ */}
          <p className="text-xs font-bold text-slate-700">รอบการประเมิน</p>
          <div className="grid grid-cols-3 gap-1.5">
            {ROUND_OPTS.map(r => (
              <button key={r.v} onClick={() => setRound(r.v)}
                className={`text-xs font-bold border rounded-lg px-2 py-1.5 ${round === r.v ? "bg-violet-50 text-violet-700 border-violet-300 ring-2 ring-violet-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                {r.l}
              </button>
            ))}
          </div>
          {round === 99 && (
            <div className="grid grid-cols-3 gap-1.5">
              <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="ชื่อรอบ เช่น รอบ 120 วัน"
                className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-violet-400"/>
              <div className="relative">
                <input value={customDays} onChange={e => setCustomDays(e.target.value.replace(/\D/g, ""))} placeholder="วัน" inputMode="numeric"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:border-violet-400 pr-8"/>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">วัน</span>
              </div>
            </div>
          )}

          {/* Evaluator picker */}
          <p className="text-xs font-bold text-slate-700 mt-1">ผู้ประเมิน (ใครก็ได้)</p>
          {!pickEmp ? (
            <div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400"/>
              <div className="mt-2 max-h-[180px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                {filtered.slice(0, 30).map(e => (
                  <button key={e.id} onClick={() => setPickEvalId(e.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 flex items-center gap-2">
                    <span className="font-bold text-slate-800">{e.first_name_th} {e.last_name_th}</span>
                    {e.nickname && <span className="text-xs text-violet-500">({e.nickname})</span>}
                    <span className="text-xs text-slate-400">{e.employee_code}</span>
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-3 py-3 text-xs text-slate-400 text-center">ไม่พบ</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-2">
              <span className="font-bold text-sm text-slate-800">{pickEmp.first_name_th} {pickEmp.last_name_th}</span>
              <span className="text-xs text-slate-500">{pickEmp.employee_code}</span>
              <button onClick={() => setPickEvalId(null)} className="ml-auto text-xs text-violet-600 hover:underline">เปลี่ยน</button>
            </div>
          )}

          <button onClick={handleAdd} disabled={saving || !pickEvalId}
            className="w-full mt-2 bg-violet-600 text-white text-sm font-bold py-2 rounded-xl hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            มอบหมาย
          </button>
        </div>
      )}
    </div>
  )
}
