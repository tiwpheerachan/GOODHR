"use client"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLanguage, useEmployeeName } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import { Phone, Mail, Calendar, Loader2, Tag, X, ChevronDown, ChevronUp, GitBranch } from "lucide-react"
import { format, differenceInMonths } from "date-fns"
import { th } from "date-fns/locale"
import BrandsTab from "@/components/employees/BrandsTab"

const supabase = createClient()

export default function TeamPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const [members, setMembers] = useState<any[]>([])
  const [balances, setBalances] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [brandModalEmp, setBrandModalEmp] = useState<any>(null)
  const [showChain, setShowChain] = useState(false)
  const mountedRef = useRef(true)
  const year = new Date().getFullYear()

  // ── ดึงลูกน้องในสาย (direct + skip-1 + additional) — เหมือนระบบ KPI ──
  const load = async () => {
    if (!user?.employee_id) return
    setLoading(true)
    try {
      const res = await fetch("/api/manager/team-chain")
      const data = await res.json()
      if (!mountedRef.current) return
      const memberList = (data.members ?? []).map((m: any) => ({
        ...m,
        // เติม first_name_th / last_name_th / position / department ให้ตรงกับโครงเดิม
        position: m.position ?? null,
        department: m.department ?? null,
      }))
      setMembers(memberList)
      setBalances(data.balances ?? {})
    } catch (e) {
      console.error("team load error:", e)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.employee_id])

  const workLabel = (hireDate: string) => {
    const m = differenceInMonths(new Date(), new Date(hireDate))
    const y = Math.floor(m / 12), mo = m % 12
    if (y > 0 && mo > 0) return `${y} ${t("common.years_short")} ${mo} ${t("common.months_short_label")}`
    if (y > 0) return `${y} ${t("common.years_short")}`
    return `${mo} ${t("common.months_short_label")}`
  }

  // ── แยก direct (ลูกน้องตรง) ออกจาก in-chain (skip + additional) ──
  const directMembers = members.filter((m: any) => m.relation === "direct" || !m.relation)
  const chainMembers = members.filter((m: any) => m.relation === "skip" || m.relation === "additional" || m.relation === "view_only")

  const renderCard = (m: any) => {
    const memberBals = balances[m.id] ?? []
    return (
            <div key={m.id} className="card space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                    : <span className="text-indigo-600 text-lg font-bold">{m.first_name_th?.[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-slate-800">{empName(m)}</p>
                    {/* Relation badge — แสดงว่าเป็นลูกน้องตรงหรือในสาย */}
                    {m.relation === "skip" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                        ในสาย L{m.depth}
                      </span>
                    )}
                    {m.relation === "additional" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        เพิ่มเติม
                      </span>
                    )}
                    {m.relation === "view_only" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                        ดูอย่างเดียว
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-primary-600 font-medium">{m.position?.name}</p>
                  <p className="text-xs text-slate-400">
                    {m.department?.name} · {m.employee_code}
                    {m.direct_manager && m.relation === "skip" && (
                      <span className="ml-1.5 text-violet-600">
                        · หน. {m.direct_manager.nickname || m.direct_manager.first_name_th}
                      </span>
                    )}
                  </p>
                </div>
                <span className={"badge shrink-0 " + (
                  m.employment_status === "active"    ? "bg-green-100 text-green-700" :
                  m.employment_status === "probation" ? "bg-yellow-100 text-yellow-700" :
                  "bg-slate-100 text-slate-500")}>
                  {m.employment_status === "active" ? t("team.status_active") : m.employment_status === "probation" ? t("team.status_probation") : m.employment_status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500">
                {m.email && <span className="flex items-center gap-1 col-span-2 truncate"><Mail size={11} className="shrink-0" /><span className="truncate">{m.email}</span></span>}
                {m.phone && <span className="flex items-center gap-1"><Phone size={11} className="shrink-0" />{m.phone}</span>}
                {m.hire_date && <span className="flex items-center gap-1"><Calendar size={11} className="shrink-0" />{workLabel(m.hire_date)}</span>}
              </div>
              {memberBals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">{t("team.leave_balance", { year })}</p>
                  <div className="flex flex-wrap gap-2">
                    {memberBals.map(b => (
                      <div key={b.id} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.leave_type?.color_hex || "#94a3b8" }} />
                        <span className="text-xs text-slate-600">{b.leave_type?.name}</span>
                        <span className="text-xs font-bold text-slate-800">{b.remaining_days}/{b.entitled_days}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── แบรนด์ที่ดูแล + % ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Tag size={11} /> แบรนด์ที่ดูแล
                  </p>
                  <button onClick={() => setBrandModalEmp(m)}
                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg">
                    + จัดการ %
                  </button>
                </div>
                {Array.isArray(m.brand) && m.brand.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {m.brand.map((b: string) => {
                      const pct = m.brand_allocations?.[b]
                      return (
                        <span key={b} className="inline-flex items-center gap-1 text-[11px] font-bold bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg">
                          {b}
                          {pct != null && pct > 0 && (
                            <span className="text-indigo-600 font-black">{pct}%</span>
                          )}
                        </span>
                      )
                    })}
                    {(!m.brand_allocations || Object.keys(m.brand_allocations).length === 0) && (
                      <span className="text-[10px] text-slate-400 italic">ยังไม่ได้กรอก % — กด "จัดการ %" เพื่อระบุสัดส่วน</span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-300 italic">ยังไม่ระบุแบรนด์ — กด "จัดการ %" เพื่อเพิ่ม</p>
                )}
              </div>
            </div>
          )
        }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-800">{t("team.title")}</h1>
        <p className="text-sm text-slate-500">
          ลูกน้องตรง {directMembers.length} คน
          {chainMembers.length > 0 && <span className="text-violet-600"> · ในสาย {chainMembers.length} คน</span>}
        </p>
      </div>
      {loading && <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>}

      {/* ── ลูกน้องตรง (default visible) ── */}
      <div className="space-y-4">
        {directMembers.map(renderCard)}
      </div>

      {/* ── ลูกน้องในสาย (skip-level + additional) — Dropdown ── */}
      {chainMembers.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-violet-200 overflow-hidden shadow-sm">
          <button onClick={() => setShowChain(s => !s)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                <GitBranch size={14} className="text-violet-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-violet-900">ลูกน้องในสาย</p>
                <p className="text-[11px] text-violet-700">
                  {chainMembers.length} คน · ลูกน้องของลูกน้องตรง + ผู้ที่ HR กำหนดให้ดูแล
                </p>
              </div>
            </div>
            {showChain ? <ChevronUp size={16} className="text-violet-600" /> : <ChevronDown size={16} className="text-violet-600" />}
          </button>
          {showChain && (
            <div className="p-4 space-y-4 bg-violet-50/30">
              {chainMembers.map(renderCard)}
            </div>
          )}
        </div>
      )}

      {!loading && members.length === 0 && <p className="text-center py-12 text-slate-400 text-sm">{t("team.no_members")}</p>}

      {/* ═══ Brand allocation modal ═══ */}
      {brandModalEmp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/40" onClick={() => { setBrandModalEmp(null); load() }}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-white font-black text-sm">🏷️ จัดการแบรนด์ + %</p>
                <p className="text-indigo-200 text-[11px] mt-0.5">{empName(brandModalEmp)} · {brandModalEmp.position?.name || "—"}</p>
              </div>
              <button onClick={() => { setBrandModalEmp(null); load() }} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <BrandsTab
                employeeId={brandModalEmp.id}
                employeeName={empName(brandModalEmp)}
                initialBrands={brandModalEmp.brand ?? null}
                initialAllocations={brandModalEmp.brand_allocations ?? null}
                feishuBrand={null}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}