"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ShieldCheck, Plus, Trash2, X, Loader2, Search, ArrowLeft, Sparkles,
  Users, Filter, CheckCircle2, AlertCircle, Building2, Briefcase,
} from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"

type Emp = {
  id: string
  first_name_th: string; last_name_th: string
  nickname?: string | null; employee_code?: string | null
  avatar_url?: string | null
  position?: { name: string } | null
  department?: { name: string } | null
}

export default function TrainingPermissionsPage() {
  const supabase = createClient()
  const [perms, setPerms] = useState<any[]>([])
  const [employees, setEmployees] = useState<Emp[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [role, setRole] = useState<"training_admin" | "training_supervisor">("training_admin")
  const [channelId, setChannelId] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [posFilter, setPosFilter] = useState("")
  const [hideGranted, setHideGranted] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [pR, cR] = await Promise.all([
      fetch("/api/training/permissions").then(r => r.json()),
      fetch("/api/training/channels").then(r => r.json()),
    ])
    setPerms(pR.permissions ?? [])
    setChannels(cR.channels ?? [])
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!showAdd || employees.length > 0) return
    supabase.from("employees")
      .select("id, first_name_th, last_name_th, nickname, employee_code, avatar_url, position:positions(name), department:departments(name)")
      .eq("is_active", true).order("first_name_th").limit(1000)
      .then(({ data }) => setEmployees((data ?? []) as any))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdd])

  // ── Already-granted lookup: key = `${empId}|${role}|${channelId||"_"}` ──
  const grantedKeys = useMemo(() => {
    const s = new Set<string>()
    for (const p of perms) {
      s.add(`${p.employee_id}|${p.role}|${p.channel_id ?? "_"}`)
    }
    return s
  }, [perms])

  // ── filter options derived from employees ──
  const departments = useMemo(() => {
    const set = new Set<string>()
    for (const e of employees) if (e.department?.name) set.add(e.department.name)
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [employees])
  const positions = useMemo(() => {
    const set = new Set<string>()
    for (const e of employees) if (e.position?.name) set.add(e.position.name)
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [employees])

  const currentKey = (empId: string) =>
    `${empId}|${role}|${role === "training_supervisor" ? (channelId || "_") : "_"}`

  const filteredEmps = useMemo(() => {
    const s = search.trim().toLowerCase()
    return employees.filter(e => {
      if (deptFilter && e.department?.name !== deptFilter) return false
      if (posFilter && e.position?.name !== posFilter) return false
      if (hideGranted && grantedKeys.has(currentKey(e.id))) return false
      if (s) {
        const hay = `${e.first_name_th} ${e.last_name_th} ${e.nickname || ""} ${e.employee_code || ""} ${e.position?.name || ""} ${e.department?.name || ""}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [employees, search, deptFilter, posFilter, hideGranted, grantedKeys, role, channelId])

  const toggleSelect = (id: string) => {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAllVisible = () => setSelected(new Set(filteredEmps.map(e => e.id)))
  const clearSelection = () => setSelected(new Set())
  const clearFilters = () => { setSearch(""); setDeptFilter(""); setPosFilter("") }

  const grantBulk = async () => {
    if (selected.size === 0) { toast.error("เลือกพนักงานก่อน"); return }
    if (role === "training_supervisor" && !channelId) { toast.error("เลือก channel"); return }
    setSaving(true)
    const t = toast.loading("กำลังเพิ่มสิทธิ์...")
    try {
      const res = await fetch("/api/training/permissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_ids: Array.from(selected), role, channel_id: channelId || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(`เพิ่ม ${d.added}/${d.requested} คน`, { id: t })
      setShowAdd(false); setSelected(new Set())
      await load()
    } catch (e: any) {
      toast.error(e.message, { id: t })
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm("ถอนสิทธิ์?")) return
    await fetch(`/api/training/permissions?id=${id}`, { method: "DELETE" })
    toast.success("ถอนแล้ว"); await load()
  }

  const adminCount = perms.filter(p => p.role === "training_admin").length
  const supCount = perms.filter(p => p.role === "training_supervisor").length

  return (
    <div className="space-y-5">
      <Link href="/admin/training" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ระบบเรียนรู้
      </Link>

      {/* Title bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">สิทธิ์ Admin / Supervisor</h2>
          <p className="text-slate-400 text-sm">Admin {adminCount} คน · Supervisor {supCount} คน · รวม {perms.length} คน</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm">
          <Plus size={14} /> เพิ่มสิทธิ์
        </button>
      </div>

      {/* ── Permissions table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm anim-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>พนักงาน</Th><Th>บทบาท</Th><Th>Channel</Th><Th>มอบเมื่อ</Th><Th> </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perms.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar emp={p.employee} size={8} />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {p.employee?.first_name_th} {p.employee?.last_name_th}
                          {p.employee?.nickname && <span className="text-xs text-slate-400 ml-1.5">({p.employee.nickname})</span>}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {p.employee?.employee_code} · {p.employee?.department?.name ?? "—"} · {p.employee?.position?.name ?? "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${p.role === "training_admin" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      {p.role === "training_admin" ? "🛡 Training Admin" : "👁 Supervisor"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.channel?.name ?? <span className="text-slate-400 italic">ทุก channel</span>}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{new Date(p.granted_at).toLocaleDateString("th-TH")}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => revoke(p.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {perms.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  <ShieldCheck size={32} className="mx-auto mb-2 text-slate-200" />
                  ยังไม่มีคนที่ได้สิทธิ์ — กด "เพิ่มสิทธิ์" เพื่อมอบหมาย
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm anim-fade-up" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-6 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} />
                <h2 className="text-lg font-black">เพิ่มสิทธิ์ — เลือกได้หลายคน</h2>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} /></button>
            </div>

            {/* Role + channel */}
            <div className="px-6 pt-4 space-y-3">
              <div>
                <p className="text-xs font-black text-slate-600 mb-1.5">บทบาท</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setRole("training_admin"); setChannelId("") }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${role === "training_admin" ? "border-rose-400 bg-rose-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className="font-bold text-sm">🛡 Training Admin</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">เห็น/แก้ทุก channel · จัดการ permissions ได้</p>
                  </button>
                  <button onClick={() => setRole("training_supervisor")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${role === "training_supervisor" ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className="font-bold text-sm">👁 Supervisor</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">ดูแลเฉพาะ channel ที่ระบุ</p>
                  </button>
                </div>
              </div>

              {role === "training_supervisor" && (
                <div>
                  <p className="text-xs font-black text-slate-600 mb-1.5">เลือก Channel *</p>
                  <select value={channelId} onChange={e => setChannelId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100">
                    <option value="">— เลือก channel —</option>
                    {channels.map(c => <option key={c.id} value={c.id}>{c.name}{c.brand ? ` · ${c.brand}` : ""}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Smart filters */}
            <div className="px-6 pt-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-44">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="ค้นหา ชื่อ · ชื่อเล่น · รหัส · แผนก · ตำแหน่ง..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                </div>
                {departments.length > 0 && (
                  <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400">
                    <option value="">ทุกแผนก</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
                {positions.length > 0 && (
                  <select value={posFilter} onChange={e => setPosFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-rose-400">
                    <option value="">ทุกตำแหน่ง</option>
                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap text-[11px]">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={hideGranted} onChange={e => setHideGranted(e.target.checked)} />
                  <span className="text-slate-600 font-bold">ซ่อนคนที่ได้สิทธิ์นี้อยู่แล้ว</span>
                </label>
                <button onClick={selectAllVisible}
                  className="px-2 py-1 bg-rose-50 text-rose-700 rounded font-bold hover:bg-rose-100">
                  เลือกที่เห็นทั้งหมด ({filteredEmps.length})
                </button>
                {selected.size > 0 && (
                  <button onClick={clearSelection}
                    className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-bold hover:bg-slate-200 inline-flex items-center gap-1">
                    <X size={11} /> ล้างที่เลือก
                  </button>
                )}
                {(search || deptFilter || posFilter) && (
                  <button onClick={clearFilters}
                    className="px-2 py-1 text-slate-500 hover:text-rose-700 font-bold inline-flex items-center gap-1">
                    <Filter size={11} /> ล้างตัวกรอง
                  </button>
                )}
                <span className="ml-auto text-slate-400">
                  <b className="text-slate-700">{filteredEmps.length}</b> / {employees.length} คน
                </span>
              </div>
            </div>

            {/* Employee list */}
            <div className="flex-1 overflow-y-auto px-6 pt-2 pb-3 min-h-0">
              {employees.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 size={20} className="mx-auto animate-spin" />
                </div>
              ) : filteredEmps.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <Users size={28} className="mx-auto mb-2 text-slate-200" />
                  ไม่พบพนักงานตามตัวกรอง
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {filteredEmps.map(e => {
                    const isPicked = selected.has(e.id)
                    const hasIt = grantedKeys.has(currentKey(e.id))
                    return (
                      <label key={e.id}
                        className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer border-2 transition-all ${
                          isPicked ? "bg-rose-50 border-rose-300" :
                          hasIt    ? "bg-slate-50 border-slate-100 opacity-70" :
                                     "bg-white border-slate-100 hover:border-rose-200 hover:bg-rose-50/30"
                        }`}>
                        <input type="checkbox" checked={isPicked} onChange={() => toggleSelect(e.id)}
                          className="w-4 h-4 accent-rose-500 flex-shrink-0" />
                        <Avatar emp={e} size={8} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {e.first_name_th} {e.last_name_th}
                            {e.nickname && <span className="text-slate-400 font-normal ml-1">({e.nickname})</span>}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                            <span>{e.employee_code}</span>
                            {e.department?.name && <><span>·</span><Building2 size={9} /><span className="truncate">{e.department.name}</span></>}
                            {e.position?.name && <><span>·</span><Briefcase size={9} /><span className="truncate">{e.position.name}</span></>}
                          </div>
                        </div>
                        {hasIt && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-0.5 flex-shrink-0">
                            <CheckCircle2 size={9} /> มีสิทธิ์
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs">
                {selected.size > 0 ? (
                  <span className="px-2.5 py-1 bg-rose-500 text-white rounded-full font-black flex items-center gap-1">
                    <CheckCircle2 size={11} /> เลือกแล้ว {selected.size} คน
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full font-bold flex items-center gap-1">
                    <AlertCircle size={11} /> ยังไม่ได้เลือก
                  </span>
                )}
              </div>
              <div className="ml-auto flex gap-2">
                <button onClick={() => setShowAdd(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">
                  ยกเลิก
                </button>
                <button onClick={grantBulk} disabled={saving || selected.size === 0}
                  className="px-5 py-2.5 text-sm font-black text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 rounded-xl disabled:opacity-50 shadow-lg shadow-rose-200 inline-flex items-center gap-1.5">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  เพิ่มสิทธิ์{selected.size > 0 ? ` (${selected.size})` : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500 whitespace-nowrap uppercase tracking-wider">{children}</th>
}

function Avatar({ emp, size = 8 }: { emp: any; size?: number }) {
  if (!emp) return null
  const cls = `w-${size} h-${size}`
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-rose-100 to-pink-100 text-rose-700 flex items-center justify-center font-black text-[10px] overflow-hidden flex-shrink-0 border border-white shadow-sm`}>
      {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : (emp.first_name_th?.[0] ?? "?")}
    </div>
  )
}
