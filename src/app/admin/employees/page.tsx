"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Search, Plus, Download, ChevronRight, ChevronLeft, Filter, Users, Building2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const STATUS: Record<string, { l: string; c: string }> = {
  active:     { l: "ปกติ",       c: "bg-green-100 text-green-700"   },
  probation:  { l: "ทดลองงาน",  c: "bg-amber-100 text-amber-700"   },
  resigned:   { l: "ลาออก",     c: "bg-slate-100 text-slate-500"   },
  terminated: { l: "เลิกจ้าง",  c: "bg-red-100 text-red-600"       },
  on_leave:   { l: "ลาพักร้อน", c: "bg-blue-100 text-blue-700"     },
  suspended:  { l: "พักงาน",    c: "bg-orange-100 text-orange-700" },
}
const EMP_TYPE: Record<string, string> = {
  full_time: "ประจำ", part_time: "พาร์ทไทม์", contract: "สัญญา", intern: "ฝึกงาน",
}
const COMPANY_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
]
const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"

export default function EmployeesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "hr_admin"

  const [employees,        setEmployees]        = useState<any[]>([])
  const [companies,        setCompanies]        = useState<any[]>([])
  const [companyCounts,    setCompanyCounts]    = useState<Record<string, number>>({})
  const [depts,            setDepts]            = useState<any[]>([])
  const [loading,          setLoading]          = useState(true)
  const [total,            setTotal]            = useState(0)
  const [page,             setPage]             = useState(0)
  const [search,           setSearch]           = useState("")
  const [status,           setStatus]           = useState("")
  const [showInactive,     setShowInactive]     = useState(false)
  const [dept,             setDept]             = useState("")
  const [selectedCompany,  setSelectedCompany]  = useState<string>("")
  const PER = 25

  const myCompanyId: string | undefined =
    user?.employee?.company_id ?? (user as any)?.company_id ?? undefined

  const activeCompanyId = isSuperAdmin
    ? (selectedCompany || undefined)
    : myCompanyId

  // ── load companies + per-company counts ───────────────────────────
  useEffect(() => {
    if (!isSuperAdmin) return
    supabase.from("companies").select("id, name_th, code").eq("is_active", true).order("name_th")
      .then(({ data }) => {
        setCompanies(data ?? [])
        // load counts per company
        Promise.all((data ?? []).map((c: any) =>
          supabase.from("employees").select("id", { count: "exact", head: true })
            .eq("company_id", c.id).eq("is_active", true).eq("employment_status", "active")
        )).then(results => {
          const counts: Record<string, number> = {}
          ;(data ?? []).forEach((c: any, i: number) => { counts[c.id] = results[i].count ?? 0 })
          setCompanyCounts(counts)
        })
      })
  }, [isSuperAdmin])

  // ── load departments ──────────────────────────────────────────────
  useEffect(() => {
    setDept("")
    if (!activeCompanyId) { setDepts([]); return }
    supabase.from("departments").select("id,name").eq("company_id", activeCompanyId).order("name")
      .then(({ data }) => setDepts(data ?? []))
  }, [activeCompanyId])

  // ── load employees ────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!isSuperAdmin && !myCompanyId) return
    setLoading(true)
    try {
      let q = supabase
        .from("employees")
        .select(
          `id, employee_code, first_name_th, last_name_th, nickname, avatar_url,
           hire_date, employment_status, employment_type, company_id,
           position:positions(name),
           department:departments(name),
           branch:branches(name),
           company:companies(id, name_th, code)`,
          { count: "exact" }
        )
        .order("first_name_th")
        .range(page * PER, (page + 1) * PER - 1)

      // ถ้าเลือกดูลาออก/เลิกจ้าง ให้แสดง is_active=false ด้วย
      if (status === "resigned" || status === "terminated" || showInactive) {
        // ไม่ filter is_active เพื่อให้เห็นคนที่ลาออกแล้ว
      } else {
        q = q.eq("is_active", true)
      }

      if (activeCompanyId)       q = q.eq("company_id", activeCompanyId)
      else if (!isSuperAdmin)    q = q.eq("company_id", myCompanyId!)
      if (status)                q = q.eq("employment_status", status)
      if (dept)                  q = q.eq("department_id", dept)
      if (search)                q = q.or(`first_name_th.ilike.%${search}%,last_name_th.ilike.%${search}%,employee_code.ilike.%${search}%,nickname.ilike.%${search}%`)

      const { data, count, error } = await q
      if (error) console.error(error)
      setEmployees(data ?? [])
      setTotal(count ?? 0)
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin, myCompanyId, activeCompanyId, search, status, dept, page, showInactive])

  useEffect(() => { load() }, [load])
  const setF = (fn: () => void) => { fn(); setPage(0) }

  // ── export CSV ────────────────────────────────────────────────────
  const exportCSV = async () => {
    let q = supabase.from("employees")
      .select(`employee_code, first_name_th, last_name_th, nickname, gender, phone, email,
               hire_date, employment_status, employment_type,
               position:positions(name), department:departments(name),
               branch:branches(name), company:companies(name_th)`)
      .eq("is_active", true).order("first_name_th")
    if (activeCompanyId)     q = q.eq("company_id", activeCompanyId) as any
    else if (!isSuperAdmin)  q = q.eq("company_id", myCompanyId!) as any
    const { data } = await q
    if (!data) return
    const hdr  = ["รหัส","บริษัท","ชื่อ","นามสกุล","ชื่อเล่น","เพศ","โทร","อีเมล","วันเริ่มงาน","สถานะ","ประเภท","ตำแหน่ง","แผนก","สาขา"]
    const rows = data.map((e: any) => [
      e.employee_code, (e.company as any)?.name_th,
      e.first_name_th, e.last_name_th, e.nickname, e.gender, e.phone, e.email,
      e.hire_date ? format(new Date(e.hire_date), "dd/MM/yyyy") : "",
      STATUS[e.employment_status]?.l, EMP_TYPE[e.employment_type] || e.employment_type,
      (e.position as any)?.name, (e.department as any)?.name, (e.branch as any)?.name,
    ])
    const csv  = [hdr, ...rows].map(r => r?.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a"); a.href = url; a.download = "employees.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const showCompanyCol = isSuperAdmin && !selectedCompany

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">พนักงาน</h2>
          <p className="text-slate-400 text-sm mt-0.5">{total.toLocaleString()} คน</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={14} /> Export CSV
          </button>
          <Link href="/admin/employees/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus size={14} /> เพิ่มพนักงาน
          </Link>
        </div>
      </div>

      {/* Company Cards — super_admin only */}
      {isSuperAdmin && companies.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* All companies */}
          <button onClick={() => setF(() => setSelectedCompany(""))}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedCompany === "" ? "border-indigo-400 bg-indigo-50" : "border-slate-100 bg-white hover:border-slate-200"}`}>
            <Building2 size={16} className={selectedCompany === "" ? "text-indigo-500" : "text-slate-300"} />
            <p className={`text-2xl font-black mt-2 ${selectedCompany === "" ? "text-indigo-700" : "text-slate-800"}`}>
              {Object.values(companyCounts).reduce((a, b) => a + b, 0)}
            </p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">ทุกบริษัท</p>
          </button>

          {companies.map((c, i) => {
            const color = COMPANY_COLORS[i % COMPANY_COLORS.length]
            const isSelected = selectedCompany === c.id
            return (
              <button key={c.id} onClick={() => setF(() => setSelectedCompany(c.id))}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${isSelected ? "border-indigo-400 bg-indigo-50" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${color}`}>{c.code}</span>
                <p className={`text-2xl font-black mt-2 ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                  {companyCounts[c.id] ?? "—"}
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">
                  {c.name_th.replace("บริษัท ", "").replace(" จำกัด", "")}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
        <Filter size={13} className="text-slate-400 flex-shrink-0" />
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setF(() => setSearch(e.target.value))}
            className={inp + " pl-8 w-full"} placeholder="ค้นหาชื่อ, รหัส, ชื่อเล่น..." />
        </div>
        {isSuperAdmin && (
          <select value={selectedCompany} onChange={e => setF(() => setSelectedCompany(e.target.value))} className={inp}>
            <option value="">ทุกบริษัท</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
          </select>
        )}
        <select value={status} onChange={e => setF(() => setStatus(e.target.value))} className={inp}>
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
        </select>
        {activeCompanyId && depts.length > 0 && (
          <select value={dept} onChange={e => setF(() => setDept(e.target.value))} className={inp}>
            <option value="">ทุกแผนก</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 cursor-pointer ml-1">
          <input type="checkbox" checked={showInactive} onChange={e => setF(() => setShowInactive(e.target.checked))} className="rounded border-slate-300"/>
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">รวมพนักงานลาออก</span>
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">พนักงาน</th>
                {showCompanyCol && <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">บริษัท</th>}
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">แผนก / ตำแหน่ง</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">สาขา</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">วันเริ่มงาน</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 whitespace-nowrap">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={showCompanyCol ? 7 : 6} className="px-4 py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    กำลังโหลด...
                  </div>
                </td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={showCompanyCol ? 7 : 6} className="px-4 py-12 text-center text-slate-400">
                  <Users size={32} className="mx-auto mb-2 text-slate-200" />
                  ไม่พบพนักงาน
                </td></tr>
              ) : employees.map(emp => {
                const compIdx = companies.findIndex(c => c.id === emp.company_id)
                const compColor = COMPANY_COLORS[compIdx >= 0 ? compIdx % COMPANY_COLORS.length : 0]
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-sm flex-shrink-0 overflow-hidden">
                          {emp.avatar_url
                            ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                            : emp.first_name_th?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 whitespace-nowrap">
                            {emp.first_name_th} {emp.last_name_th}
                            {emp.nickname && <span className="text-xs text-slate-400 ml-1.5">({emp.nickname})</span>}
                          </p>
                          <p className="text-xs text-slate-400">{emp.employee_code}</p>
                        </div>
                      </div>
                    </td>

                    {showCompanyCol && (
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-[10px] font-black px-2 py-1 rounded-lg whitespace-nowrap ${compColor}`}>
                          {(emp.company as any)?.code}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-32 truncate">
                          {(emp.company as any)?.name_th?.replace("บริษัท ","").replace(" จำกัด","")}
                        </p>
                      </td>
                    )}

                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-700 whitespace-nowrap">{(emp.position as any)?.name || "—"}</p>
                      <p className="text-xs text-slate-400">{(emp.department as any)?.name || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{(emp.branch as any)?.name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {emp.hire_date ? format(new Date(emp.hire_date), "d MMM yyyy", { locale: th }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS[emp.employment_status]?.c || "bg-slate-100 text-slate-500"}`}>
                        {STATUS[emp.employment_status]?.l || emp.employment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/employees/${emp.id}`}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap">
                        แก้ไข <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {total > PER && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400 text-xs">{page * PER + 1}–{Math.min((page + 1) * PER, total)} จาก {total.toLocaleString()} คน</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={12} /> ก่อนหน้า
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PER >= total}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">
                ถัดไป <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}