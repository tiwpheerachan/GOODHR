"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Plus, ClipboardList, Loader2, X, Search, Calendar,
  Layers, Store, Users, CheckCircle2, Trash2, ChevronRight, ChevronDown,
  Copy, AlertCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

export default function AssignmentsPage() {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [tab, setTab] = useState<"by_me" | "to_me">("by_me")

  const load = () => {
    setLoading(true)
    const param = tab === "by_me" ? "assigned_by=me" : "assignee_id=me"
    fetch(`/api/branch-eval/assignments?${param}`).then(r => r.json()).then(d => {
      setAssignments(d.assignments ?? [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [tab])

  const del = async (id: string, title: string) => {
    if (!confirm(`ลบการบ้าน "${title}"?\n(ลบ targets ทั้งหมด แต่ฟอร์มที่ทำไปแล้วยังคงอยู่)`)) return
    const res = await fetch(`/api/branch-eval/assignments?id=${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("ลบไม่สำเร็จ"); return }
    toast.success("ลบแล้ว"); load()
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      <Link href="/app/branch-eval/manage" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> จัดการสาขา
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ClipboardList size={20} className="text-orange-500" /> การบ้าน
          </h2>
          <p className="text-slate-400 text-sm">มอบหมาย template ให้ลูกน้องประเมินสาขา + ติดตามความคืบหน้า</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-black inline-flex items-center gap-1.5 shadow">
          <Plus size={14} /> มอบการบ้านใหม่
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <TabBtn active={tab === "by_me"} onClick={() => setTab("by_me")}>📤 ที่ฉันมอบ</TabBtn>
        <TabBtn active={tab === "to_me"} onClick={() => setTab("to_me")}>📥 ที่ได้รับมา</TabBtn>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : assignments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <ClipboardList size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-500">
            {tab === "by_me" ? "ยังไม่ได้มอบการบ้านใคร" : "ยังไม่มีใครมอบการบ้านให้"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a: any) => {
            const stats = a._stats
            const overdue = a.due_date && new Date(a.due_date) < new Date() && stats.done < stats.total
            return (
              <div key={a.id} className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${
                stats.done === stats.total ? "border-emerald-200"
                : overdue ? "border-rose-200"
                : "border-slate-100"
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    stats.done === stats.total ? "bg-emerald-100 text-emerald-700"
                    : overdue ? "bg-rose-100 text-rose-700"
                    : "bg-orange-100 text-orange-700"
                  }`}>
                    <ClipboardList size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/app/branch-eval/manage/assignments/${a.id}`}
                      className="font-black text-slate-800 hover:text-orange-700">
                      {a.title}
                    </Link>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      <Layers size={9} className="inline" /> {a.template?.name}
                      {tab === "to_me" && a.assigner && <> · มอบโดย {a.assigner.first_name_th} {a.assigner.last_name_th}</>}
                      {a.due_date && <> · <Calendar size={9} className="inline" /> ครบ {format(new Date(a.due_date), "d MMM yyyy", { locale: th })}</>}
                    </p>
                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${
                          stats.done === stats.total ? "bg-emerald-500" : "bg-orange-500"
                        }`} style={{ width: `${stats.progress}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-700">{stats.done}/{stats.total}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1"><Users size={9}/>{stats.assignee_count} คน</span>
                      <span className="inline-flex items-center gap-1"><Store size={9}/>{stats.branch_count} สาขา</span>
                      {stats.done === stats.total && <span className="text-emerald-700 font-bold inline-flex items-center gap-1"><CheckCircle2 size={9}/>เสร็จสิ้น</span>}
                      {overdue && <span className="text-rose-700 font-bold">เลยกำหนด</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {tab === "by_me" && (
                      <button onClick={() => del(a.id, a.title)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded">
                        <Trash2 size={12} />
                      </button>
                    )}
                    <Link href={`/app/branch-eval/manage/assignments/${a.id}`}
                      className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew && <NewAssignmentModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }} />}
    </div>
  )
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-sm font-bold border-b-2 transition ${
        active ? "border-orange-500 text-orange-700" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}>
      {children}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────────
// Modal: Create new assignment
// ──────────────────────────────────────────────────────────────────
function NewAssignmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const supabase = createClient()
  const [step, setStep] = useState(1)  // 1=template, 2=assignees, 3=branches, 4=confirm
  const [templates, setTemplates] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [form, setForm] = useState({
    template_id: "",            // default template ของการบ้าน
    title: "",
    description: "",
    due_date: "",
    assignees: new Set<string>(),
    // perPerson: Map<assigneeId, Map<branchId, templateId>>
    // โครงสร้างซ้อน → ลูกน้องคนหนึ่งมีสาขาของตัวเอง พร้อม template ของแต่ละสาขา
    perPerson: new Map<string, Map<string, string>>(),
  })
  // UI state สำหรับ accordion
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)
  const [addingBranchFor, setAddingBranchFor] = useState<string | null>(null)
  const [perPersonBranchSearch, setPerPersonBranchSearch] = useState("")
  const [empSearch, setEmpSearch] = useState("")
  const [brSearch, setBrSearch] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/branch-eval/templates").then(r => r.json()).catch(() => ({ templates: [] })),
      supabase.from("employees").select("id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, employee_code, department:departments(name)")
        .eq("is_active", true).order("first_name_th").limit(2000),
      supabase.from("branches").select("id, code, name, company_id, company:companies(code,name_th)")
        .eq("is_active", true).order("name").limit(1500),
    ]).then(([t, e, b]) => {
      setTemplates(t.templates ?? [])
      setEmployees(e.data ?? [])
      setBranches(b.data ?? [])
    })
  }, [])

  const tpl = templates.find(t => t.id === form.template_id)

  // Smart filter (multi-term)
  const empFiltered = useMemo(() => {
    const terms = empSearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return employees.slice(0, 50)
    return employees.filter((e: any) => {
      const hay = `${e.first_name_th || ""} ${e.last_name_th || ""} ${e.first_name_en || ""} ${e.last_name_en || ""} ${e.nickname || ""} ${e.employee_code || ""} ${e.department?.name || ""}`.toLowerCase()
      return terms.every(t => hay.includes(t))
    }).slice(0, 80)
  }, [employees, empSearch])

  const brFiltered = useMemo(() => {
    const terms = brSearch.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return branches.slice(0, 80)
    return branches.filter((b: any) => {
      const hay = `${b.name || ""} ${b.code || ""} ${b.company?.name_th || ""} ${b.company?.code || ""}`.toLowerCase()
      return terms.every(t => hay.includes(t))
    }).slice(0, 100)
  }, [branches, brSearch])

  // ── per-person helpers ────────────────────────────────────────
  const getPersonBranches = (aid: string): Map<string, string> =>
    form.perPerson.get(aid) ?? new Map()
  const addBranchToPerson = (aid: string, bid: string) => setForm(f => {
    const next = new Map(f.perPerson)
    const inner = new Map(next.get(aid) ?? new Map())
    if (!inner.has(bid)) inner.set(bid, f.template_id)  // default template
    next.set(aid, inner)
    return { ...f, perPerson: next }
  })
  const removeBranchFromPerson = (aid: string, bid: string) => setForm(f => {
    const next = new Map(f.perPerson)
    const inner = new Map(next.get(aid) ?? new Map())
    inner.delete(bid)
    next.set(aid, inner)
    return { ...f, perPerson: next }
  })
  const setBranchTplForPerson = (aid: string, bid: string, tplId: string) => setForm(f => {
    const next = new Map(f.perPerson)
    const inner = new Map(next.get(aid) ?? new Map())
    inner.set(bid, tplId)
    next.set(aid, inner)
    return { ...f, perPerson: next }
  })
  // คัดลอก (สาขา + template) จากคนอื่นมาให้คนนี้ทั้งชุด (replace)
  const copyFromPerson = (toAid: string, fromAid: string) => setForm(f => {
    const fromBranches = f.perPerson.get(fromAid)
    if (!fromBranches) return f
    const next = new Map(f.perPerson)
    next.set(toAid, new Map(fromBranches))
    return { ...f, perPerson: next }
  })

  const toggleEmp = (id: string) => setForm(f => {
    const next = new Set(f.assignees)
    const nextPP = new Map(f.perPerson)
    if (next.has(id)) {
      next.delete(id)
      nextPP.delete(id)  // ลบสาขาของคนนี้ออกด้วย
    } else {
      next.add(id)
      if (!nextPP.has(id)) nextPP.set(id, new Map())  // init empty
    }
    return { ...f, assignees: next, perPerson: nextPP }
  })

  // นับ total targets (sum ของทุกคน)
  const totalTargetCount = (() => {
    let n = 0
    for (const branches of Array.from(form.perPerson.values())) n += branches.size
    return n
  })()
  // คนที่ยังไม่มีสาขา → block next
  const peopleWithNoBranches = (() => {
    const ids: string[] = []
    for (const aid of Array.from(form.assignees)) {
      if (!(form.perPerson.get(aid)?.size ?? 0)) ids.push(aid)
    }
    return ids
  })()

  const canNext = (() => {
    if (step === 1) return !!form.template_id && form.title.trim().length > 0
    if (step === 2) return form.assignees.size > 0
    if (step === 3) return totalTargetCount > 0 && peopleWithNoBranches.length === 0
    return true
  })()

  const save = async () => {
    setSaving(true)
    const t = toast.loading("กำลังมอบหมาย...")
    try {
      // Flatten perPerson → targets[]
      const targets: { assignee_id: string; branch_id: string; template_id: string }[] = []
      for (const [aid, branches] of Array.from(form.perPerson.entries())) {
        for (const [bid, tid] of Array.from(branches.entries())) {
          targets.push({ assignee_id: aid, branch_id: bid, template_id: tid })
        }
      }
      const res = await fetch("/api/branch-eval/assignments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: form.template_id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          due_date: form.due_date || null,
          targets,
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "มอบหมายไม่สำเร็จ", { id: t }); return }
      toast.success(`มอบหมาย ${d.target_count} งานสำเร็จ`, { id: t })
      onCreated()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} />
            <h3 className="font-black">มอบการบ้านใหม่ — ขั้นตอน {step}/4</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
        </div>

        {/* Steps progress */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-2">
          {["template", "ลูกน้อง", "สาขา", "ยืนยัน"].map((label, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={n} className="flex-1 flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                  done ? "bg-emerald-500 text-white"
                  : active ? "bg-orange-500 text-white"
                  : "bg-slate-200 text-slate-500"
                }`}>{done ? "✓" : n}</div>
                <span className={`text-[10px] font-bold ${active ? "text-orange-700" : "text-slate-500"}`}>{label}</span>
                {n < 4 && <div className={`flex-1 h-0.5 ${done ? "bg-emerald-500" : "bg-slate-200"}`} />}
              </div>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
          {/* Step 1: Template + title + due_date */}
          {step === 1 && (
            <>
              <div>
                <p className="text-[11px] font-bold text-slate-600 mb-1">📋 Default Template *</p>
                <p className="text-[10px] text-slate-400 mb-1">เลือก template เริ่มต้น — แต่ละสาขาเปลี่ยน template เป็นแบบอื่นได้ในขั้นที่ 3</p>
                <select value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400">
                  <option value="">— เลือก template เริ่มต้น —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-600 mb-1">📝 ชื่อการบ้าน *</p>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder='เช่น "ตรวจสาขาภาคเหนือ Q2"'
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-600 mb-1">📅 ครบกำหนด (ไม่บังคับ)</p>
                <input type="date" value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-600 mb-1">📃 รายละเอียดเพิ่มเติม (ไม่บังคับ)</p>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="คำสั่ง / focus จุดที่ต้องดู / ข้อควรระวัง"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" />
              </div>
            </>
          )}

          {/* Step 2: Assignees */}
          {step === 2 && (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-[11px] text-orange-800">
                👥 เลือกลูกน้องที่จะมอบให้ทำการบ้านนี้ (เลือกได้หลายคน)
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} autoFocus
                  placeholder="ค้นหาชื่อ / รหัส / แผนก..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <p className="text-[11px] text-slate-500">เลือกแล้ว <b className="text-orange-700">{form.assignees.size}</b> คน · พบ {empFiltered.length}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {empFiltered.map((e: any) => {
                  const picked = form.assignees.has(e.id)
                  return (
                    <label key={e.id}
                      className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer border-2 transition ${picked ? "bg-orange-50 border-orange-300" : "bg-white border-slate-100 hover:border-orange-200"}`}>
                      <input type="checkbox" checked={picked} onChange={() => toggleEmp(e.id)} className="w-4 h-4 accent-orange-500" />
                      <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-black flex-shrink-0">{e.first_name_th?.[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{e.first_name_th} {e.last_name_th}{e.nickname && <span className="text-slate-400 font-normal ml-1">({e.nickname})</span>}</p>
                        <p className="text-[9px] text-slate-400">{e.employee_code} · {e.department?.name || "—"}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </>
          )}

          {/* Step 3: Per-person cards — เลือกสาขา + template ของลูกน้องแต่ละคน */}
          {step === 3 && (() => {
            const selectedAssignees = employees.filter((e: any) => form.assignees.has(e.id))
            const peopleDone = selectedAssignees.length - peopleWithNoBranches.length
            return (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-[11px] text-orange-900">
                  <p className="font-black">💡 วิธีใช้</p>
                  <p className="mt-0.5 text-orange-800">
                    1. กดเปิดการ์ดของแต่ละลูกน้อง → 2. กด <b>"+ เพิ่มสาขา"</b> → 3. เลือก template ของแต่ละสาขา
                  </p>
                  <p className="mt-1 text-orange-700">
                    📊 ทั้งหมด <b>{totalTargetCount}</b> งาน · ตั้งค่าเสร็จ <b>{peopleDone}/{selectedAssignees.length}</b> คน
                    {peopleWithNoBranches.length > 0 && (
                      <span className="text-rose-700 font-bold ml-1">⚠️ {peopleWithNoBranches.length} คนยังไม่มีสาขา</span>
                    )}
                  </p>
                </div>

                {/* Per-person cards */}
                <div className="space-y-2">
                  {selectedAssignees.map((person: any) => {
                    const personBranches = getPersonBranches(person.id)
                    const isExpanded = expandedPerson === person.id
                    const isEmpty = personBranches.size === 0
                    const otherPeople = selectedAssignees.filter((p: any) =>
                      p.id !== person.id && (form.perPerson.get(p.id)?.size ?? 0) > 0
                    )
                    return (
                      <div key={person.id} className={`rounded-2xl border-2 overflow-hidden transition ${
                        isEmpty ? "border-rose-200 bg-rose-50/20" : "border-slate-200 bg-white"
                      }`}>
                        {/* Header */}
                        <button onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
                          className="w-full flex items-center gap-2.5 p-3 hover:bg-slate-50/50">
                          <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs flex-shrink-0">
                            {person.first_name_th?.[0]}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-black text-sm text-slate-800 truncate">
                              {person.first_name_th} {person.last_name_th}
                              {person.nickname && <span className="text-slate-400 font-normal ml-1">({person.nickname})</span>}
                            </p>
                            <p className="text-[10px] mt-0.5">
                              {isEmpty ? (
                                <span className="text-rose-600 font-bold inline-flex items-center gap-1">
                                  <AlertCircle size={10}/> ยังไม่มีสาขา — กดเปิดเพื่อเพิ่ม
                                </span>
                              ) : (() => {
                                const uniqTpls = new Set(Array.from(personBranches.values())).size
                                return (
                                  <span className="text-slate-600">
                                    <b className="text-orange-700">{personBranches.size}</b> สาขา · <b>{uniqTpls}</b> template
                                  </span>
                                )
                              })()}
                            </p>
                          </div>
                          <ChevronDown size={16} className={`text-slate-400 transition flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </button>

                        {/* Body */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50/30 p-3 space-y-2">
                            {/* รายการสาขาของคนนี้ */}
                            {Array.from(personBranches.entries()).map(([bid, tid]) => {
                              const branch = branches.find((b: any) => b.id === bid)
                              if (!branch) return null
                              const isOverride = tid !== form.template_id
                              return (
                                <div key={bid} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                                  <Store size={12} className="text-sky-500 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate">{branch.name}</p>
                                    <p className="text-[9px] text-slate-400">{branch.code}</p>
                                  </div>
                                  <select value={tid}
                                    onChange={e => setBranchTplForPerson(person.id, bid, e.target.value)}
                                    className={`text-[10px] font-bold rounded px-1.5 py-1 outline-none max-w-[140px] ${
                                      isOverride
                                        ? "bg-amber-50 border border-amber-300 text-amber-800"
                                        : "bg-slate-50 border border-slate-200 text-slate-700"
                                    }`}>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                                  <button onClick={() => removeBranchFromPerson(person.id, bid)}
                                    className="p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded flex-shrink-0">
                                    <X size={11} />
                                  </button>
                                </div>
                              )
                            })}

                            {/* Inline branch picker — กางเฉพาะคนนี้ */}
                            {addingBranchFor === person.id ? (
                              <div className="bg-white border-2 border-orange-200 rounded-xl p-2 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Search size={13} className="text-slate-400 flex-shrink-0 ml-1" />
                                  <input value={perPersonBranchSearch}
                                    onChange={e => setPerPersonBranchSearch(e.target.value)}
                                    autoFocus
                                    placeholder="ค้นหาสาขา..."
                                    className="flex-1 bg-transparent text-xs outline-none" />
                                  <button onClick={() => { setAddingBranchFor(null); setPerPersonBranchSearch("") }}
                                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 px-1.5 py-0.5">
                                    ปิด
                                  </button>
                                </div>
                                {(() => {
                                  // กรอง + ตัด สาขาที่คนนี้มีอยู่แล้ว
                                  const filtered = brFiltered.filter((b: any) => !personBranches.has(b.id))
                                  const search = perPersonBranchSearch.trim().toLowerCase()
                                  const visible = search.length > 0
                                    ? filtered.filter((b: any) =>
                                        `${b.name} ${b.code} ${b.company?.name_th || ""}`.toLowerCase().includes(search))
                                    : filtered
                                  return (
                                    <>
                                      {visible.length > 0 && (
                                        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                                          <span>พบ {visible.length} สาขา</span>
                                          <button onClick={() => {
                                            visible.slice(0, 50).forEach((b: any) => addBranchToPerson(person.id, b.id))
                                          }}
                                            className="font-bold text-orange-600 hover:text-orange-800 underline">
                                            + เพิ่มทั้งหมดที่เห็น
                                          </button>
                                        </div>
                                      )}
                                      <div className="max-h-[200px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1">
                                        {visible.map((b: any) => (
                                          <button key={b.id} onClick={() => addBranchToPerson(person.id, b.id)}
                                            className="flex items-center gap-1.5 p-1.5 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 rounded-lg border border-transparent text-left transition">
                                            <Store size={11} className="text-sky-500 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[11px] font-bold truncate">{b.name}</p>
                                              <p className="text-[9px] text-slate-400">{b.code}</p>
                                            </div>
                                            <Plus size={11} className="text-orange-500 flex-shrink-0" />
                                          </button>
                                        ))}
                                        {visible.length === 0 && (
                                          <p className="col-span-2 text-center text-[10px] text-slate-400 py-3 italic">
                                            ไม่พบสาขา{search.length > 0 && " — ลองค้นคำอื่น"}
                                          </p>
                                        )}
                                      </div>
                                    </>
                                  )
                                })()}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button onClick={() => { setAddingBranchFor(person.id); setPerPersonBranchSearch("") }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black rounded-lg shadow-sm">
                                  <Plus size={12} /> เพิ่มสาขา
                                </button>
                                {otherPeople.length > 0 && (
                                  <select onChange={e => {
                                    if (e.target.value) {
                                      copyFromPerson(person.id, e.target.value)
                                      e.target.value = ""
                                    }
                                  }}
                                    className="text-[10px] font-bold bg-violet-50 border border-violet-200 text-violet-700 rounded-lg px-2 py-1.5 outline-none cursor-pointer">
                                    <option value="">📋 คัดลอกจากลูกน้อง...</option>
                                    {otherPeople.map((p: any) => (
                                      <option key={p.id} value={p.id}>
                                        {p.first_name_th} {p.last_name_th?.[0]}. ({form.perPerson.get(p.id)?.size} สาขา)
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {personBranches.size > 0 && (
                                  <button onClick={() => {
                                    if (confirm(`ลบทุกสาขาของ ${person.first_name_th}?`)) {
                                      setForm(f => {
                                        const next = new Map(f.perPerson)
                                        next.set(person.id, new Map())
                                        return { ...f, perPerson: next }
                                      })
                                    }
                                  }}
                                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700 px-2 py-1.5">
                                    🗑️ ล้างทั้งหมด
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}

          {/* Step 4: Confirm */}
          {step === 4 && (() => {
            const selectedAssignees = employees.filter((e: any) => form.assignees.has(e.id))
            const tplCounts = new Map<string, number>()
            const branchSet = new Set<string>()
            for (const branches of Array.from(form.perPerson.values())) {
              for (const [bid, tid] of Array.from(branches.entries())) {
                branchSet.add(bid)
                tplCounts.set(tid, (tplCounts.get(tid) || 0) + 1)
              }
            }
            const uniqTpls = tplCounts.size
            return (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                  <p className="font-black text-emerald-800 mb-2">✅ สรุปการบ้านที่จะมอบ</p>
                  <ul className="text-xs text-emerald-700 space-y-1">
                    <li>📋 <b>{form.title}</b></li>
                    {form.due_date && <li>📅 ครบกำหนด: <b>{format(new Date(form.due_date), "d MMM yyyy", { locale: th })}</b></li>}
                    <li>👥 ลูกน้อง: <b>{form.assignees.size}</b> คน</li>
                    <li>🏪 สาขาที่จะถูกประเมิน (unique): <b>{branchSet.size}</b> สาขา</li>
                    <li>📝 Template ที่ใช้: <b>{uniqTpls}</b> แบบ {uniqTpls > 1 && <span className="text-violet-700">(per-target)</span>}</li>
                    <li className="text-emerald-900 font-black">⚙️ จะสร้าง <b>{totalTargetCount}</b> งานทั้งหมด</li>
                  </ul>
                </div>

                {/* Per-person breakdown */}
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2">👥 งานของแต่ละคน</p>
                  <div className="space-y-1.5">
                    {selectedAssignees.map((p: any) => {
                      const bs = form.perPerson.get(p.id) ?? new Map()
                      const uniq = new Set(Array.from(bs.values())).size
                      return (
                        <div key={p.id} className="flex items-center gap-2 text-xs">
                          <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-black text-[10px]">
                            {p.first_name_th?.[0]}
                          </div>
                          <span className="font-bold text-slate-700">{p.first_name_th} {p.last_name_th}</span>
                          <span className="text-slate-500">→ <b className="text-slate-700">{bs.size}</b> สาขา · <b className="text-violet-600">{uniq}</b> template</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Template breakdown */}
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2">📝 แบ่งตาม template</p>
                  <div className="space-y-1.5">
                    {Array.from(tplCounts.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([tid, n]) => {
                        const t = templates.find(x => x.id === tid)
                        return (
                          <div key={tid} className="flex items-center gap-2 text-xs">
                            <span className="bg-violet-100 text-violet-700 font-black px-2 py-0.5 rounded-full">📋 {t?.name}</span>
                            <span className="text-slate-500">→ <b className="text-slate-700">{n}</b> งาน</span>
                          </div>
                        )
                      })}
                  </div>
                </div>

                {form.description && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] font-black text-slate-500 mb-1">รายละเอียด</p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{form.description}</p>
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg">
            {step > 1 ? "← ย้อนกลับ" : "ยกเลิก"}
          </button>
          {step < 4 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNext}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black rounded-lg">
              ถัดไป →
            </button>
          ) : (
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-lg inline-flex items-center gap-1.5">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              ยืนยันมอบหมาย
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
