"use client"
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Target, Search, ChevronDown, ChevronUp, Loader2, BarChart3,
  Award, MessageSquare, Eye, TrendingUp, Users, Building2, Filter,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const MONTHS = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]

const GRADE_CONF: Record<string, { bg: string; text: string; ring: string; barColor: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", barColor: "bg-emerald-500" },
  B: { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200",    barColor: "bg-blue-500" },
  C: { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   barColor: "bg-amber-500" },
  D: { bg: "bg-red-50",     text: "text-red-700",     ring: "ring-red-200",     barColor: "bg-red-500" },
}

const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"

// ── Mini Donut ────────────────────────────────────────────────────────────────
function GradeDonut({ counts, total }: { counts: Record<string, number>; total: number }) {
  const r = 36, circ = 2 * Math.PI * r
  const colors = { A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#ef4444" }
  let off = 0
  const arcs = (["A", "B", "C", "D"] as const).map(g => {
    const len = total > 0 ? (counts[g] / total) * circ : 0
    const arc = { color: colors[g], da: `${len} ${circ - len}`, do: -(off) + (circ * 0.25) }
    off += len; return arc
  })
  return (
    <svg width={88} height={88} className="-rotate-90">
      <circle cx={44} cy={44} r={r} fill="none" stroke="#f1f5f9" strokeWidth={12} />
      {arcs.map((a, i) => (
        <circle key={i} cx={44} cy={44} r={r} fill="none" stroke={a.color} strokeWidth={12}
          strokeDasharray={a.da} strokeDashoffset={a.do} strokeLinecap="butt" />
      ))}
    </svg>
  )
}

export default function AdminKpiPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState<number | null>(null)
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [gradeFilter, setGradeFilter] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [companyFilter, setCompanyFilter] = useState("")
  const [evaluatorFilter, setEvaluatorFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  // Companies for multi-company orgs
  const [companies, setCompanies] = useState<any[]>([])

  // Detail expand
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Load companies (for super_admin)
  useEffect(() => {
    if (!user) return
    const role = (user as any)?.role
    if (role === "super_admin") {
      supabase.from("companies").select("id, name_th, code").eq("is_active", true)
        .then(({ data }) => setCompanies(data ?? []))
    }
  }, [user]) // eslint-disable-line

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ mode: "admin", year: String(year) })
    if (month) params.set("month", String(month))
    try {
      const res = await fetch(`/api/kpi?${params}`)
      const data = await res.json()
      setForms(data.forms ?? [])
    } catch {}
    setLoading(false)
  }, [year, month])

  useEffect(() => { if (user) load() }, [user, load])

  const loadDetail = async (formId: string) => {
    if (expanded === formId) { setExpanded(null); setDetail(null); return }
    setExpanded(formId)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/kpi?mode=single&form_id=${formId}`)
      const data = await res.json()
      setDetail(data.form)
    } catch {}
    setDetailLoading(false)
  }

  // Derived filter options
  const departments = Array.from(new Set(forms.map((f: any) => f.employee?.department?.name).filter(Boolean)))
  const evaluators = Array.from(new Set(forms.map((f: any) => {
    const ev = f.evaluator
    return ev ? `${ev.first_name_th} ${ev.last_name_th}` : null
  }).filter(Boolean)))

  // Apply filters
  const filtered = forms.filter(f => {
    const name = `${f.employee?.first_name_th ?? ""} ${f.employee?.last_name_th ?? ""} ${f.employee?.employee_code ?? ""}`.toLowerCase()
    if (search && !name.includes(search.toLowerCase())) return false
    if (gradeFilter && f.grade !== gradeFilter) return false
    if (deptFilter && f.employee?.department?.name !== deptFilter) return false
    if (statusFilter && f.status !== statusFilter) return false
    if (evaluatorFilter) {
      const evName = f.evaluator ? `${f.evaluator.first_name_th} ${f.evaluator.last_name_th}` : ""
      if (evName !== evaluatorFilter) return false
    }
    return true
  })

  // Stats
  const gradeCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  filtered.forEach(f => { if (gradeCount[f.grade] !== undefined) gradeCount[f.grade]++ })
  const avgScore = filtered.length > 0 ? filtered.reduce((s: number, f: any) => s + f.total_score, 0) / filtered.length : 0
  const submittedCount = filtered.filter(f => f.status === "submitted").length
  const draftCount = filtered.filter(f => f.status === "draft").length

  // Department averages
  const deptAvg: Record<string, { sum: number; count: number }> = {}
  filtered.filter(f => f.status === "submitted").forEach(f => {
    const dept = f.employee?.department?.name || "ไม่ระบุ"
    if (!deptAvg[dept]) deptAvg[dept] = { sum: 0, count: 0 }
    deptAvg[dept].sum += f.total_score
    deptAvg[dept].count++
  })
  const deptAvgList = Object.entries(deptAvg)
    .map(([name, d]) => ({ name, avg: d.sum / d.count, count: d.count }))
    .sort((a, b) => b.avg - a.avg)

  const activeFilters = [gradeFilter, deptFilter, evaluatorFilter, statusFilter, search].filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target size={20} className="text-indigo-600" />
            <h1 className="text-xl font-black text-slate-800">ผลประเมิน KPI</h1>
          </div>
          <p className="text-sm text-slate-400">ดูและวิเคราะห์ผลประเมินพนักงานทุกคน</p>
        </div>
        {activeFilters > 0 && (
          <button onClick={() => { setSearch(""); setGradeFilter(""); setDeptFilter(""); setEvaluatorFilter(""); setStatusFilter("") }}
            className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors">
            ล้างตัวกรอง ({activeFilters})
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-2">
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={inp}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month ?? ""} onChange={e => setMonth(e.target.value ? Number(e.target.value) : null)} className={inp}>
          <option value="">ทุกเดือน</option>
          {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        {companies.length > 1 && (
          <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className={inp}>
            <option value="">ทุกบริษัท</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
          </select>
        )}
        {departments.length > 0 && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className={inp}>
            <option value="">ทุกแผนก</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className={inp}>
          <option value="">ทุกเกรด</option>
          {["A", "B", "C", "D"].map(g => <option key={g} value={g}>เกรด {g}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inp}>
          <option value="">ทุกสถานะ</option>
          <option value="submitted">ส่งแล้ว</option>
          <option value="draft">แบบร่าง</option>
        </select>
        {evaluators.length > 0 && (
          <select value={evaluatorFilter} onChange={e => setEvaluatorFilter(e.target.value)} className={inp}>
            <option value="">ทุกผู้ประเมิน</option>
            {evaluators.map(ev => <option key={ev} value={ev!}>{ev}</option>)}
          </select>
        )}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / รหัส..."
            className={`${inp} pl-9 w-full`}
          />
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Grade Overview */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 mb-3">สัดส่วนเกรด</p>
          <div className="flex items-center gap-4">
            <GradeDonut counts={gradeCount} total={filtered.length} />
            <div className="flex-1 space-y-1.5">
              {(["A", "B", "C", "D"] as const).map(g => {
                const gc = GRADE_CONF[g]
                const pct = filtered.length > 0 ? ((gradeCount[g] / filtered.length) * 100) : 0
                return (
                  <div key={g} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-md ${gc.bg} ${gc.text} text-[10px] font-black flex items-center justify-center`}>{g}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${gc.barColor} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-8 text-right">{gradeCount[g]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Score Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 mb-3">สรุปคะแนน</p>
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500">คะแนนเฉลี่ย</span>
              <span className="text-2xl font-black text-slate-800">{avgScore.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">ทั้งหมด</span>
              <span className="text-sm font-black text-slate-700">{filtered.length} ฟอร์ม</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">ส่งแล้ว</span>
              <span className="text-sm font-bold text-emerald-600">{submittedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">แบบร่าง</span>
              <span className="text-sm font-bold text-amber-600">{draftCount}</span>
            </div>
          </div>
        </div>

        {/* Department Ranking */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 mb-3">
            <Building2 size={12} className="inline mr-1" />
            คะแนนเฉลี่ยตามแผนก
          </p>
          {deptAvgList.length === 0 ? (
            <p className="text-xs text-slate-300 py-6 text-center">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2.5">
              {deptAvgList.slice(0, 5).map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                    i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}>{i + 1}</span>
                  <span className="flex-1 text-sm text-slate-700 truncate">{d.name}</span>
                  <span className="text-xs text-slate-400">{d.count} คน</span>
                  <span className={`text-sm font-black ${d.avg >= 81 ? "text-emerald-600" : d.avg >= 71 ? "text-amber-600" : "text-red-500"}`}>
                    {d.avg.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Award size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">ไม่พบข้อมูล KPI</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Table header */}
          <div className="hidden lg:grid grid-cols-[2fr_1fr_0.7fr_0.7fr_0.5fr_0.7fr_0.5fr_40px] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500">
            <span>พนักงาน</span>
            <span>แผนก</span>
            <span>เดือน</span>
            <span>คะแนน</span>
            <span>เกรด</span>
            <span>ผู้ประเมิน</span>
            <span>สถานะ</span>
            <span></span>
          </div>

          {filtered.map((form: any) => {
            const emp = form.employee
            const isOpen = expanded === form.id
            const items = detail?.items?.sort((a: any, b: any) => a.order_no - b.order_no) ?? []
            const gc = GRADE_CONF[form.grade] || GRADE_CONF.D

            return (
              <div key={form.id} className="border-b border-slate-50 last:border-0">
                <button onClick={() => loadDetail(form.id)}
                  className="w-full lg:grid lg:grid-cols-[2fr_1fr_0.7fr_0.7fr_0.5fr_0.7fr_0.5fr_40px] gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left flex flex-wrap items-center">
                  {/* Employee */}
                  <div className="flex items-center gap-3 min-w-0 w-full lg:w-auto mb-2 lg:mb-0">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-100 flex items-center justify-center shrink-0">
                      {emp?.avatar_url
                        ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-indigo-600 text-sm font-bold">{emp?.first_name_th?.[0]}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{emp?.first_name_th} {emp?.last_name_th}</p>
                      <p className="text-xs text-slate-400">{emp?.employee_code} · {emp?.position?.name}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-600 hidden lg:block truncate">{emp?.department?.name}</span>
                  <span className="text-sm text-slate-600">{MONTHS[form.month]}</span>
                  <span className="text-sm font-bold text-slate-800">{form.total_score?.toFixed(1)}%</span>
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ring-1 ${gc.bg} ${gc.text} ${gc.ring}`}>{form.grade}</span>
                  <span className="text-xs text-slate-500 hidden lg:block truncate">
                    {form.evaluator?.first_name_th} {form.evaluator?.last_name_th}
                  </span>
                  <span className={`text-xs font-bold ${form.status === "submitted" ? "text-emerald-600" : "text-amber-600"}`}>
                    {form.status === "submitted" ? "ส่งแล้ว" : "ร่าง"}
                  </span>
                  <div className="shrink-0">
                    {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-4">
                    {detailLoading ? (
                      <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                          <Eye size={12} />
                          <span>ประเมินโดย {detail?.evaluator?.first_name_th} {detail?.evaluator?.last_name_th}</span>
                          {detail?.submitted_at && (
                            <span className="text-slate-400">
                              · {format(new Date(detail.submitted_at), "d MMM yyyy HH:mm", { locale: th })}
                            </span>
                          )}
                        </div>
                        {items.map((item: any, idx: number) => (
                          <div key={item.id || idx} className="bg-white rounded-xl p-3">
                            <div className="flex items-start gap-2">
                              <span className="w-6 h-6 rounded-md bg-indigo-50 text-xs font-bold text-indigo-600 flex items-center justify-center shrink-0">{item.order_no}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-800">{item.category}</p>
                                  {item.is_mandatory && <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">บังคับ</span>}
                                </div>
                                {item.description && <p className="text-xs text-slate-400 whitespace-pre-line mt-0.5 line-clamp-2">{item.description}</p>}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">น้ำหนัก {item.weight_pct}%</span>
                                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md">คะแนน {item.actual_score}/100</span>
                                  <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-md">ได้ {item.weighted_score?.toFixed(1)}</span>
                                </div>
                                {item.comment && (
                                  <p className="text-xs text-slate-400 italic mt-1.5 flex items-start gap-1">
                                    <MessageSquare size={10} className="shrink-0 mt-0.5" /> {item.comment}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {detail?.evaluator_note && (
                          <div className="bg-white rounded-xl p-3">
                            <p className="text-xs font-bold text-slate-500 mb-1">ความเห็นภาพรวม</p>
                            <p className="text-sm text-slate-600">{detail.evaluator_note}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
