"use client"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  ShieldCheck, Crown, Users, Store, BookOpen,
  ClipboardList, ShoppingBag, ChevronRight, RefreshCw,
  Search, ArrowLeft, ExternalLink, Loader2, AlertCircle, Sparkles, X, Check,
} from "lucide-react"
import toast from "react-hot-toast"

type Emp = {
  id: string
  employee_code: string
  first_name_th: string
  last_name_th: string
  nickname?: string | null
  avatar_url?: string | null
  department?: { name: string } | null
  position?: { name: string } | null
}

type CategoryKey = "system" | "branch_eval" | "training" | "evaluators" | "sales" | "other"

const SYSTEM_ROLE_OPTIONS = [
  { value: "super_admin",     label: "Super Admin",     desc: "เข้าได้ทุกอย่าง" },
  { value: "hr_admin",        label: "HR Admin",        desc: "บริหารพนักงาน + เห็น /admin" },
  { value: "manager",         label: "Manager",         desc: "ดูแลทีม + เข้า /manager" },
  { value: "equipment_admin", label: "Equipment Admin", desc: "อนุมัติเบิก/คืนอุปกรณ์" },
  { value: "employee",        label: "Employee",        desc: "พนักงานทั่วไป" },
]

export default function PermissionsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  // member popup สำหรับเปลี่ยน system role
  const [editMember, setEditMember] = useState<{ emp: Emp; currentRole: string } | null>(null)

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setErr(null)
    try {
      const res = await fetch("/api/permissions/overview")
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? "โหลดไม่สำเร็จ"); return }
      setData(d)
      setLastRefresh(new Date())
    } catch (e: any) {
      setErr(e.message ?? "Network error")
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }
  useEffect(() => { load(false) }, [])
  useEffect(() => {
    const i = setInterval(() => load(true), 60_000)
    const onVis = () => { if (document.visibilityState === "visible") load(true) }
    document.addEventListener("visibilitychange", onVis)
    return () => { clearInterval(i); document.removeEventListener("visibilitychange", onVis) }
  }, [])

  // counts สำหรับแสดงในแต่ละแถว
  const counts = useMemo(() => {
    if (!data) return {} as Record<CategoryKey, number>
    const sum = (obj: Record<string, any[]> | undefined) =>
      Object.values(obj ?? {}).reduce((s: number, l: any) => s + (l?.length ?? 0), 0)
    return {
      system: sum(data.system_roles),
      branch_eval: sum(data.branch_eval),
      training: sum(data.training),
      evaluators: sum(data.evaluators),
      sales: sum(data.sales),
      other: 0,
    } as Record<CategoryKey, number>
  }, [data])

  const totalPeople = useMemo(() => {
    if (!data) return 0
    const ids = new Set<string>()
    const collect = (obj: Record<string, any[]> | undefined) => {
      for (const list of Object.values(obj ?? {}) as any[][]) {
        for (const e of list) ids.add(e.id ?? e.employee_code)
      }
    }
    collect(data.system_roles); collect(data.branch_eval); collect(data.training); collect(data.evaluators); collect(data.sales)
    return ids.size
  }, [data])

  if (loading) return (
    <div className="space-y-3">
      <div className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
      {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
    </div>
  )
  if (err) return (
    <div className="p-6 text-center">
      <AlertCircle size={28} className="mx-auto text-rose-400 mb-2" />
      <p className="text-sm text-rose-600 font-bold">{err}</p>
      <button onClick={() => load(false)} className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold">
        ลองใหม่
      </button>
    </div>
  )

  // ─── Focused view เมื่อเลือก category ────────────────────────
  if (activeCategory) {
    return (
      <FocusedCategory
        category={activeCategory}
        data={data}
        search={search}
        setSearch={setSearch}
        onBack={() => setActiveCategory(null)}
        onEditMember={(emp, role) => setEditMember({ emp, currentRole: role })}
        editMember={editMember}
        closeEdit={() => setEditMember(null)}
        onRoleChanged={() => load(true)}
      />
    )
  }

  // ─── Main list view ─────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">บทบาทและสิทธิ์ในระบบ</h2>
          <p className="text-slate-400 text-sm">เลือกหมวดที่ต้องการดู / แก้ไข — แต่ละหมวดจะเปิดเป็นหน้าเฉพาะ</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors">
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {lastRefresh.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
        </button>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiTile label="คนที่มีสิทธิ์รวม" value={totalPeople} color="indigo" icon={<Users size={16} />} />
        <KpiTile label="หมวดสิทธิ์ทั้งหมด" value={6} color="emerald" icon={<ShieldCheck size={16} />} />
        <KpiTile label="ระดับสิทธิ์ที่ใช้งาน" value={Object.values(counts).filter(c => c > 0).length}
          color="rose" icon={<Crown size={16} />} />
      </div>

      {/* List rows */}
      <div className="space-y-2">
        <RowCategory
          color="rose" icon={<Crown size={18} />}
          title="บทบาทระดับระบบ (System Role)"
          subtitle="Super Admin · HR Admin · Manager · Equipment Admin · Employee"
          count={counts.system}
          onClick={() => setActiveCategory("system")}
        />
        <RowCategory
          color="sky" icon={<Store size={18} />}
          title="ระบบประเมินสาขา"
          subtitle="Admin · Supervisor · Evaluator (ผูกกับสาขา)"
          count={counts.branch_eval}
          onClick={() => setActiveCategory("branch_eval")}
        />
        <RowCategory
          color="emerald" icon={<BookOpen size={18} />}
          title="ระบบเรียนรู้ (Training)"
          subtitle="Admin · Supervisor · Viewer (ผูกกับ channel)"
          count={counts.training}
          onClick={() => setActiveCategory("training")}
        />
        <RowCategory
          color="violet" icon={<ClipboardList size={18} />}
          title="ผู้ประเมินเพิ่มเติม"
          subtitle="KPI · Probation · All-Round · View-Only"
          count={counts.evaluators}
          onClick={() => setActiveCategory("evaluators")}
        />
        <RowCategory
          color="amber" icon={<ShoppingBag size={18} />}
          title="ระบบขายสินค้า (Sales)"
          subtitle="Admin · Manager · Staff"
          count={counts.sales}
          onClick={() => setActiveCategory("sales")}
        />
        <RowCategory
          color="slate" icon={<Sparkles size={18} />}
          title="สิทธิ์อื่นที่กระจายในระบบ"
          subtitle="หัวหน้าตรง · KPI Evaluator Override · Skip-level"
          count={null}
          onClick={() => setActiveCategory("other")}
        />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Row Component — แต่ละ category ในรายการหลัก
// ────────────────────────────────────────────────────────────────────
function RowCategory({ color, icon, title, subtitle, count, onClick }: {
  color: string; icon: React.ReactNode; title: string; subtitle: string
  count: number | null; onClick: () => void
}) {
  const palette: Record<string, { bg: string; text: string; bar: string }> = {
    rose:    { bg: "bg-rose-50",    text: "text-rose-600",    bar: "bg-rose-400" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-600",     bar: "bg-sky-400" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-400" },
    violet:  { bg: "bg-violet-50",  text: "text-violet-600",  bar: "bg-violet-400" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600",   bar: "bg-amber-400" },
    slate:   { bg: "bg-slate-50",   text: "text-slate-600",   bar: "bg-slate-300" },
  }
  const p = palette[color] ?? palette.slate
  return (
    <button onClick={onClick}
      className="group w-full bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden relative text-left">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${p.bar}`} />
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className={`w-11 h-11 rounded-xl ${p.bg} ${p.text} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-800 truncate">{title}</p>
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        </div>
        {count !== null && (
          <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full flex-shrink-0">
            {count} คน
          </span>
        )}
        <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition flex-shrink-0" />
      </div>
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────
// Focused Category — แสดง 1 หมวดเต็มหน้า + คลิก member เพื่อแก้ไข
// ────────────────────────────────────────────────────────────────────
function FocusedCategory({
  category, data, search, setSearch, onBack, onEditMember, editMember, closeEdit, onRoleChanged,
}: {
  category: CategoryKey
  data: any
  search: string
  setSearch: (s: string) => void
  onBack: () => void
  onEditMember: (emp: Emp, currentRole: string) => void
  editMember: { emp: Emp; currentRole: string } | null
  closeEdit: () => void
  onRoleChanged: () => void
}) {
  const meta = CATEGORY_META[category]
  const groups = buildGroups(category, data)

  const filteredGroups = groups.map(g => ({
    ...g,
    members: g.members.filter((m: any) => {
      const s = search.trim().toLowerCase()
      if (!s) return true
      const hay = `${m.first_name_th ?? ""} ${m.last_name_th ?? ""} ${m.nickname ?? ""} ${m.employee_code ?? ""}`.toLowerCase()
      return hay.includes(s)
    })
  }))

  const canInlineEdit = category === "system"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
          <ArrowLeft size={13} /> กลับ
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-slate-800 truncate">{meta.title}</h2>
          <p className="text-xs text-slate-500 truncate">{meta.subtitle}</p>
        </div>
      </div>

      {/* Search + manage link */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="bg-white border border-slate-100 rounded-2xl px-3 py-2 shadow-sm flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / รหัส / นิคเนม ในหมวดนี้"
            className="flex-1 bg-transparent outline-none text-sm" />
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-rose-500 font-bold px-1">ล้าง</button>
          )}
        </div>
        {meta.manageHref && (
          <Link href={meta.manageHref}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
            <ExternalLink size={12} /> {canInlineEdit ? "หน้าจัดการเต็ม" : "เพิ่ม / แก้ไขสิทธิ์"}
          </Link>
        )}
      </div>

      {canInlineEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-800 flex items-start gap-2">
          <Sparkles size={12} className="mt-0.5 flex-shrink-0" />
          <span><b>คลิกที่กล่องชื่อ</b> เพื่อเปลี่ยนสิทธิ์ระดับระบบให้คนนั้นได้ทันที</span>
        </div>
      )}

      {/* Groups */}
      {category === "other" ? (
        <OtherPermissionsView />
      ) : filteredGroups.every(g => g.members.length === 0) ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <ShieldCheck size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">{search.trim() ? "ไม่พบใครตรงคำค้นในหมวดนี้" : "ยังไม่มีคนในหมวดนี้"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((g, i) => {
            if (g.members.length === 0 && search.trim()) return null
            return (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">{g.label}</span>
                    {g.desc && <span className="text-[11px] text-slate-400">— {g.desc}</span>}
                  </div>
                  <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">{g.members.length}</span>
                </div>
                <div className="p-3">
                  {g.members.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-3">ไม่มี</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {g.members.map((m: any, j: number) => (
                        <MemberCard key={m.id ?? j} emp={m} role={g.key}
                          clickable={canInlineEdit}
                          onClick={() => canInlineEdit && onEditMember(m, g.key)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit modal (system role only) */}
      {editMember && (
        <ChangeRoleModal
          member={editMember.emp}
          currentRole={editMember.currentRole}
          onClose={closeEdit}
          onSaved={() => { closeEdit(); onRoleChanged() }}
        />
      )}
    </div>
  )
}

function MemberCard({ emp, role, clickable, onClick }: {
  emp: Emp; role: string; clickable: boolean; onClick: () => void
}) {
  const Wrap: any = clickable ? "button" : "div"
  return (
    <Wrap onClick={clickable ? onClick : undefined} type={clickable ? "button" : undefined}
      className={`bg-slate-50/60 border border-slate-100 rounded-xl p-2.5 flex items-center gap-2 text-left w-full ${
        clickable ? "hover:bg-white hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all" : ""
      }`}>
      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center text-xs font-black text-slate-600 flex-shrink-0">
        {emp.avatar_url
          ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
          : (emp.first_name_th?.[0] ?? "?")}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-slate-800 truncate">
          {emp.first_name_th} {emp.last_name_th}
          {emp.nickname && <span className="text-slate-400 font-normal"> ({emp.nickname})</span>}
        </p>
        <p className="text-[10px] text-slate-500 truncate">
          {emp.employee_code}
          {emp.department?.name && <> · {emp.department.name}</>}
        </p>
      </div>
      {clickable && <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />}
    </Wrap>
  )
}

// ────────────────────────────────────────────────────────────────────
// Change Role Modal — สำหรับ system role
// ────────────────────────────────────────────────────────────────────
function ChangeRoleModal({ member, currentRole, onClose, onSaved }: {
  member: Emp; currentRole: string; onClose: () => void; onSaved: () => void
}) {
  const [selected, setSelected] = useState(currentRole)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (selected === currentRole) { onClose(); return }
    setSaving(true)
    const t = toast.loading("กำลังเปลี่ยนสิทธิ์...")
    try {
      const res = await fetch("/api/users/role", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: member.id, role: selected }),
      })
      const d = await res.json()
      if (!d.success) { toast.error(d.error || "เปลี่ยนไม่สำเร็จ", { id: t }); return }
      toast.success(`เปลี่ยน ${member.first_name_th} เป็น ${selected}`, { id: t })
      onSaved()
    } catch (e: any) {
      toast.error(e?.message || "Network error", { id: t })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Crown size={16} className="text-indigo-600" />
          <h3 className="font-black flex-1">เปลี่ยนสิทธิ์ระดับระบบ</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white border overflow-hidden flex items-center justify-center text-sm font-black text-slate-600">
              {member.avatar_url
                ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                : (member.first_name_th?.[0] ?? "?")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate">{member.first_name_th} {member.last_name_th}</p>
              <p className="text-[10px] text-slate-500">{member.employee_code} · ปัจจุบัน: <b>{currentRole}</b></p>
            </div>
          </div>
          <div>
            <p className="text-xs font-black text-slate-600 mb-1.5">เปลี่ยนเป็น</p>
            <div className="space-y-1.5">
              {SYSTEM_ROLE_OPTIONS.map(r => (
                <label key={r.value}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 cursor-pointer transition ${
                    selected === r.value ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300"
                  }`}>
                  <input type="radio" checked={selected === r.value}
                    onChange={() => setSelected(r.value)}
                    className="w-4 h-4 accent-indigo-500" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{r.label}</p>
                    <p className="text-[10px] text-slate-500">{r.desc}</p>
                  </div>
                  {selected === r.value && <Check size={14} className="text-indigo-600" />}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-100">
            ยกเลิก
          </button>
          <button onClick={save} disabled={saving || selected === currentRole}
            className="px-4 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-40 inline-flex items-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

function OtherPermissionsView() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
      <div className="p-5 space-y-3">
        <p className="text-sm text-slate-600">
          ระบบยังมีสิทธิ์โดยอ้อมอีกหลายอย่างที่กำหนดผ่านตำแหน่งหรือสายงาน — ไม่ได้อยู่ในตาราง permission โดยตรง
        </p>
        <ul className="space-y-3">
          <li className="bg-slate-50/60 rounded-xl p-3">
            <p className="text-sm font-black text-slate-800">หัวหน้าตรง (Direct Manager)</p>
            <p className="text-xs text-slate-500 mt-0.5">กำหนดที่ <code className="bg-white px-1 rounded">employee_manager_history</code> → ดูแล/ประเมินทีมตามสาย</p>
            <Link href="/admin/org-chart" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">
              ดูผังองค์กร <ChevronRight size={11} />
            </Link>
          </li>
          <li className="bg-slate-50/60 rounded-xl p-3">
            <p className="text-sm font-black text-slate-800">KPI Evaluator Override</p>
            <p className="text-xs text-slate-500 mt-0.5"><code className="bg-white px-1 rounded">employees.kpi_evaluator_id</code> ทับ default = หัวหน้าตรง</p>
            <Link href="/admin/employees" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">
              ตั้งที่หน้าพนักงาน → tab สาย/ผู้ประเมิน <ChevronRight size={11} />
            </Link>
          </li>
          <li className="bg-slate-50/60 rounded-xl p-3">
            <p className="text-sm font-black text-slate-800">Skip-level Access</p>
            <p className="text-xs text-slate-500 mt-0.5">หัวหน้าของหัวหน้า เห็นทีมข้ามชั้นโดยอัตโนมัติ</p>
          </li>
        </ul>
      </div>
    </div>
  )
}

function KpiTile({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  const palette: Record<string, { bg: string; text: string }> = {
    indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    slate:   { bg: "bg-slate-50",   text: "text-slate-600" },
  }
  const p = palette[color] ?? palette.slate
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg ${p.bg} ${p.text} flex items-center justify-center`}>{icon}</div>
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{label}</p>
      </div>
      <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────
// Metadata + group builder
// ────────────────────────────────────────────────────────────────────
const CATEGORY_META: Record<CategoryKey, { title: string; subtitle: string; manageHref?: string }> = {
  system:      { title: "บทบาทระดับระบบ (System Role)", subtitle: "กำหนดที่ users.role — รากของสิทธิ์ทั้งหมด · คลิกชื่อเพื่อเปลี่ยน", manageHref: "/admin/employees" },
  branch_eval: { title: "ระบบประเมินสาขา",               subtitle: "กำหนดผ่าน branch_eval_permissions — ผูกกับสาขา",            manageHref: "/admin/branch-eval/permissions" },
  training:    { title: "ระบบเรียนรู้ (Training)",        subtitle: "กำหนดผ่าน training_permissions — ผูกกับ channel",           manageHref: "/admin/training/permissions" },
  evaluators:  { title: "ผู้ประเมินเพิ่มเติม",              subtitle: "กำหนดผ่าน employee_evaluators — นอกเหนือจากหัวหน้าตรง",    manageHref: "/admin/employees" },
  sales:       { title: "ระบบขายสินค้า (Sales)",          subtitle: "กำหนดผ่าน product_sale_permissions",                       manageHref: "/admin/sales" },
  other:       { title: "สิทธิ์อื่นที่กระจายในระบบ",          subtitle: "สิทธิ์โดยอ้อม / ตามตำแหน่ง" },
}

function buildGroups(category: CategoryKey, data: any): Array<{ key: string; label: string; desc: string; members: any[] }> {
  if (category === "system") return [
    { key: "super_admin",     label: "🛡 Super Admin",     desc: "เข้าได้ทุกอย่าง", members: data.system_roles?.super_admin ?? [] },
    { key: "hr_admin",        label: "👔 HR Admin",        desc: "บริหารพนักงาน",     members: data.system_roles?.hr_admin ?? [] },
    { key: "manager",         label: "👥 Manager",         desc: "ดูแลทีม",            members: data.system_roles?.manager ?? [] },
    { key: "equipment_admin", label: "🔧 Equipment Admin", desc: "อนุมัติเบิก/คืน",   members: data.system_roles?.equipment_admin ?? [] },
    { key: "employee",        label: "👤 Employee",        desc: "พนักงานทั่วไป",     members: data.system_roles?.employee ?? [] },
  ]
  if (category === "branch_eval") return [
    { key: "branch_eval_admin",      label: "🛡 Admin",      desc: "ทุกสาขา + แก้ template", members: data.branch_eval?.branch_eval_admin ?? [] },
    { key: "branch_eval_supervisor", label: "👁 Supervisor", desc: "ดูแล + รีวิว ต่อสาขา",  members: data.branch_eval?.branch_eval_supervisor ?? [] },
    { key: "branch_eval_evaluator",  label: "📝 Evaluator",  desc: "กรอกฟอร์ม",             members: data.branch_eval?.branch_eval_evaluator ?? [] },
  ]
  if (category === "training") return [
    { key: "training_admin",      label: "🎯 Admin",      desc: "ทุก channel",      members: data.training?.training_admin ?? [] },
    { key: "training_supervisor", label: "🎓 Supervisor", desc: "CRUD per channel", members: data.training?.training_supervisor ?? [] },
    { key: "training_viewer",     label: "👁 Viewer",     desc: "อ่านอย่างเดียว",   members: data.training?.training_viewer ?? [] },
  ]
  if (category === "evaluators") return [
    { key: "kpi",       label: "📊 KPI Evaluator",      desc: "ประเมิน KPI",         members: data.evaluators?.kpi ?? [] },
    { key: "probation", label: "⏱ Probation Evaluator", desc: "ประเมินทดลองงาน",     members: data.evaluators?.probation ?? [] },
    { key: "all",       label: "✨ All-Round",          desc: "ประเมินได้ทุกอย่าง",  members: data.evaluators?.all ?? [] },
    { key: "view_only", label: "👁 View-Only",          desc: "ดูได้อย่างเดียว",     members: data.evaluators?.view_only ?? [] },
  ]
  if (category === "sales") return [
    { key: "admin",   label: "🛡 Admin",   desc: "CRUD ทุกอย่าง",      members: data.sales?.admin ?? [] },
    { key: "manager", label: "👥 Manager", desc: "ดูยอดทีม",            members: data.sales?.manager ?? [] },
    { key: "staff",   label: "📋 Staff",   desc: "บันทึกยอดของตัวเอง",  members: data.sales?.staff ?? [] },
  ]
  return []
}
