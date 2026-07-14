"use client"
/**
 * PayrollAccessManager — จัดการสิทธิ์ดูเงินเดือน (payroll_access) "เหนือกว่า super_admin"
 *   1 คน = 1 การ์ด · ติ๊กเลือกได้หลายบริษัท (หรือ "ทุกบริษัท") · แก้ไข/ลบได้
 */
import { useEffect, useState, useRef, useMemo } from "react"
import {
  ShieldCheck, X, Trash2, Loader2, Search, Building2, Globe, Pencil, Check,
} from "lucide-react"
import toast from "react-hot-toast"
import { useLanguage, useEmployeeName } from "@/lib/i18n"

type Member = {
  id: string
  user_id: string
  company_id: string | null
  company_name: string | null; company_code: string | null
  email: string | null
  first_name_th: string | null; last_name_th: string | null
  first_name_en: string | null; last_name_en: string | null
  nickname: string | null; nickname_en: string | null
}
type Candidate = {
  id: string
  employee_code: string | null
  email: string | null
  first_name_th: string | null; last_name_th: string | null
  first_name_en: string | null; last_name_en: string | null
  nickname: string | null; nickname_en: string | null
  avatar_url: string | null
}
type Company = { id: string; name_th: string; code: string | null }

// รวมแถวเป็นรายคน
type Person = {
  user_id: string
  email: string | null
  first_name_th: string | null; last_name_th: string | null
  first_name_en: string | null; last_name_en: string | null
  nickname: string | null; nickname_en: string | null
  all: boolean
  companyIds: string[]
}

// เป้าหมายที่กำลังแก้ไข/เพิ่ม
type EditTarget = {
  user_id?: string          // แก้คนเดิม
  employee_id?: string      // เพิ่มคนใหม่
  name: string
  all: boolean
  companyIds: Set<string>
}

export default function PayrollAccessManager() {
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const [hasAccess, setHasAccess] = useState(false)
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [scopeAll, setScopeAll] = useState(false)
  const [loading, setLoading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── ค้นหา (สำหรับเพิ่มคนใหม่) ──
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Candidate[]>([])
  const [searching, setSearching] = useState(false)
  const debRef = useRef<any>(null)

  // ── ตัวแก้ไข (checklist บริษัท) ──
  const [editing, setEditing] = useState<EditTarget | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/payroll-access")
      const d = await res.json()
      setHasAccess(!!d.hasAccess)
      setMembers(d.members ?? [])
      setCompanies(d.companies ?? [])
      setScopeAll(!!d.scope?.all)
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // รวมแถว → รายคน
  const persons: Person[] = useMemo(() => {
    const map = new Map<string, Person>()
    for (const m of members) {
      if (!map.has(m.user_id)) {
        map.set(m.user_id, {
          user_id: m.user_id, email: m.email,
          first_name_th: m.first_name_th, last_name_th: m.last_name_th,
          first_name_en: m.first_name_en, last_name_en: m.last_name_en,
          nickname: m.nickname, nickname_en: m.nickname_en,
          all: false, companyIds: [],
        })
      }
      const p = map.get(m.user_id)!
      if (m.company_id === null) p.all = true
      else p.companyIds.push(m.company_id)
    }
    return Array.from(map.values())
  }, [members])

  const grantedUserIds = useMemo(() => new Set(persons.map(p => p.user_id)), [persons])
  const companyName = (id: string) => companies.find(c => c.id === id)?.name_th || id

  // ค้นหาแบบ debounce
  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current)
    const q = query.trim()
    if (q.length < 1) { setResults([]); setSearching(false); return }
    setSearching(true)
    debRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/payroll-access?q=${encodeURIComponent(q)}`)
        const d = await res.json()
        setResults(d.results ?? [])
      } catch { setResults([]) } finally { setSearching(false) }
    }, 250)
    return () => { if (debRef.current) clearTimeout(debRef.current) }
  }, [query])

  function startAdd(c: Candidate) {
    setQuery(""); setResults([])
    setEditing({ employee_id: c.id, name: empName(c as any), all: false, companyIds: new Set() })
  }
  function startEdit(p: Person) {
    setEditing({
      user_id: p.user_id,
      name: (p.first_name_th || p.first_name_en) ? empName(p as any) : (p.email || p.user_id),
      all: p.all, companyIds: new Set(p.companyIds),
    })
  }

  async function save() {
    if (!editing) return
    const nSelected = editing.all ? 1 : editing.companyIds.size
    if (nSelected === 0) { toast.error(t("admin.payroll.pa_choose_companies")); return }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/payroll-access", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editing.user_id, employee_id: editing.employee_id,
          all: editing.all, company_ids: Array.from(editing.companyIds),
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "Error"); return }
      setMembers(d.members ?? [])
      setEditing(null)
      toast.success(t("admin.payroll.pa_added"))
    } catch { toast.error("Error") } finally { setSaving(false) }
  }

  async function remove(userId: string) {
    if (!confirm(t("admin.payroll.pa_confirm_remove"))) return
    setRemovingId(userId)
    try {
      const res = await fetch(`/api/admin/payroll-access?user_id=${userId}`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "Error"); return }
      setMembers(d.members ?? [])
      toast.success(t("admin.payroll.pa_removed"))
    } catch { toast.error("Error") } finally { setRemovingId(null) }
  }

  if (!hasAccess) return null

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors">
        <ShieldCheck size={14}/> {t("admin.payroll.pa_manage_btn")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setOpen(false); setEditing(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
              <p className="font-black flex items-center gap-2"><ShieldCheck size={16}/> {t("admin.payroll.pa_title")}</p>
              <button onClick={() => { setOpen(false); setEditing(null) }} className="p-1 hover:bg-white/20 rounded"><X size={18}/></button>
            </div>

            {/* ══ โหมดแก้ไข/เพิ่ม: checklist บริษัท ══ */}
            {editing ? (
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-sm shrink-0">
                    {editing.name[0]}
                  </div>
                  <p className="text-sm font-black text-slate-800">{editing.name}</p>
                </div>

                <p className="text-[11px] font-bold text-slate-400 uppercase">{t("admin.payroll.pa_choose_companies")}</p>

                <div className="space-y-1.5">
                  {/* ทุกบริษัท (เฉพาะคนสิทธิ์เต็ม) */}
                  {scopeAll && (
                    <button onClick={() => setEditing(e => e && ({ ...e, all: !e.all }))}
                      className={"flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors " +
                        (editing.all ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:bg-slate-50")}>
                      <span className={"flex h-5 w-5 items-center justify-center rounded-md border-2 shrink-0 " +
                        (editing.all ? "border-violet-500 bg-violet-500 text-white" : "border-slate-300")}>
                        {editing.all && <Check size={13}/>}
                      </span>
                      <Globe size={15} className="text-violet-500 shrink-0"/>
                      <span className="text-sm font-bold text-slate-700">{t("admin.payroll.all_companies")}</span>
                    </button>
                  )}

                  {/* รายบริษัท (disable เมื่อเลือกทุกบริษัท) */}
                  {companies.map(co => {
                    const checked = editing.companyIds.has(co.id)
                    const dim = editing.all
                    return (
                      <button key={co.id} disabled={dim}
                        onClick={() => setEditing(e => {
                          if (!e) return e
                          const s = new Set(e.companyIds)
                          checked ? s.delete(co.id) : s.add(co.id)
                          return { ...e, companyIds: s }
                        })}
                        className={"flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors " +
                          (dim ? "opacity-40 cursor-not-allowed border-slate-200 " : "") +
                          (checked && !dim ? "border-sky-300 bg-sky-50" : "border-slate-200 hover:bg-slate-50")}>
                        <span className={"flex h-5 w-5 items-center justify-center rounded-md border-2 shrink-0 " +
                          (checked ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300")}>
                          {checked && <Check size={13}/>}
                        </span>
                        <Building2 size={15} className="text-sky-500 shrink-0"/>
                        <span className="text-sm font-medium text-slate-700 truncate">{co.name_th}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditing(null)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">
                    {t("admin.payroll.pa_cancel")}
                  </button>
                  <button onClick={save} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-60">
                    {saving ? <Loader2 size={15} className="animate-spin"/> : <Check size={15}/>} {t("admin.payroll.pa_save")}
                  </button>
                </div>
              </div>
            ) : (
              /* ══ โหมดปกติ: ค้นหา + รายชื่อ ══ */
              <div className="p-5 space-y-4 overflow-y-auto">
                <p className="text-xs text-slate-500">{t("admin.payroll.pa_desc")}</p>

                {/* ค้นหาเพิ่มคนใหม่ */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input value={query} onChange={e => setQuery(e.target.value)}
                    placeholder={t("admin.payroll.pa_search_ph")}
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400"/>
                  {searching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-300"/>}

                  {query.trim().length >= 1 && (
                    <div className="mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-sm">
                      {searching && results.length === 0 ? (
                        <p className="px-3 py-3 text-center text-xs text-slate-400">{t("admin.payroll.pa_searching")}</p>
                      ) : results.length === 0 ? (
                        <p className="px-3 py-3 text-center text-xs text-slate-400">{t("admin.payroll.pa_no_result")}</p>
                      ) : (
                        results.map(c => {
                          const already = grantedUserIds.size > 0 && members.some(m => m.email && c.email && m.email === c.email)
                          return (
                            <button key={c.id} onClick={() => startAdd(c)}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-amber-50">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-amber-100 text-amber-700 font-black flex items-center justify-center text-sm shrink-0">
                                {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover"/> : (c.first_name_th || c.first_name_en || "?")[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-700 truncate">{empName(c as any)}</p>
                                <p className="text-[11px] text-slate-400 truncate">{[c.employee_code, c.email].filter(Boolean).join(" · ")}</p>
                              </div>
                              {already
                                ? <span className="text-[10px] font-bold text-emerald-500 shrink-0">{t("admin.payroll.pa_edit")}</span>
                                : <span className="text-xs font-bold text-amber-600 shrink-0">+ {t("admin.payroll.pa_new_person")}</span>}
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* รายชื่อผู้มีสิทธิ์ (รายคน) */}
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">
                    {t("admin.payroll.pa_members")} ({persons.length})
                  </p>
                  {loading ? (
                    <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-300"/></div>
                  ) : persons.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">{t("admin.payroll.pa_empty")}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {persons.map(p => (
                        <div key={p.user_id} className="flex items-start gap-2 bg-slate-50 rounded-xl p-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-sm shrink-0">
                            {(p.first_name_th || p.first_name_en || p.email || "?")[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">
                              {(p.first_name_th || p.first_name_en) ? empName(p as any) : (p.email || p.user_id)}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {p.all ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-600">
                                  <Globe size={9}/> {t("admin.payroll.all_companies")}
                                </span>
                              ) : p.companyIds.map(cid => (
                                <span key={cid} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-600">
                                  <Building2 size={9}/> {companyName(cid)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button onClick={() => startEdit(p)} title={t("admin.payroll.pa_edit")}
                              className="p-1.5 hover:bg-amber-100 text-amber-600 rounded-lg">
                              <Pencil size={13}/>
                            </button>
                            <button onClick={() => remove(p.user_id)} disabled={removingId === p.user_id}
                              className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg" title={t("admin.payroll.pa_remove")}>
                              {removingId === p.user_id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={13}/>}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
