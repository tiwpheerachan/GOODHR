"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ShieldCheck, Plus, Trash2, X, Loader2, Search, ArrowLeft,
  Users, Filter, CheckCircle2, AlertCircle, Building2, Briefcase, Store,
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

export default function BranchEvalPermissionsPage() {
  const supabase = createClient()
  const [perms, setPerms] = useState<any[]>([])
  const [employees, setEmployees] = useState<Emp[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [me, setMe] = useState<any>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [role, setRole] = useState<"branch_eval_admin" | "branch_eval_supervisor" | "branch_eval_evaluator">("branch_eval_admin")
  const [branchId, setBranchId] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [p, m] = await Promise.all([
      fetch("/api/branch-eval/permissions").then(r => r.json()),
      fetch("/api/branch-eval/me").then(r => r.json()),
    ])
    setPerms(p.permissions ?? []); setMe(m)
    // load branches the user can see (admin sees all)
    const b = await fetch("/api/branch-eval/branches-for-me").then(r => r.json())
    setBranches(b.branches ?? [])
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!showAdd || employees.length > 0) return
    supabase.from("employees")
      .select("id, first_name_th, last_name_th, nickname, employee_code, avatar_url, position:positions(name), department:departments(name)")
      .eq("is_active", true).order("first_name_th").limit(1500)
      .then(({ data }) => setEmployees((data ?? []) as any))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdd])

  const grantedKeys = useMemo(() => {
    const s = new Set<string>()
    for (const p of perms) s.add(`${p.employee_id}|${p.role}|${p.branch_id ?? "_"}`)
    return s
  }, [perms])

  const currentKey = (empId: string) =>
    `${empId}|${role}|${role === "branch_eval_admin" ? "_" : (branchId || "_")}`

  const filteredEmps = useMemo(() => {
    const s = search.trim().toLowerCase()
    return employees.filter(e => {
      if (grantedKeys.has(currentKey(e.id))) return false
      if (s) {
        const hay = `${e.first_name_th} ${e.last_name_th} ${e.nickname ?? ""} ${e.employee_code ?? ""} ${e.position?.name ?? ""} ${e.department?.name ?? ""}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [employees, search, grantedKeys, role, branchId])

  const toggle = (id: string) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const grant = async () => {
    if (selected.size === 0) { toast.error("เลือกพนักงานก่อน"); return }
    if ((role !== "branch_eval_admin") && !branchId) { toast.error("เลือกสาขา"); return }
    setSaving(true)
    const t = toast.loading("กำลังเพิ่มสิทธิ์...")
    try {
      const res = await fetch("/api/branch-eval/permissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_ids: Array.from(selected), role,
          branch_id: branchId || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(`เพิ่ม ${d.added}/${d.requested} คน`, { id: t })
      setShowAdd(false); setSelected(new Set())
      await load()
    } catch (e: any) { toast.error(e.message, { id: t }) }
    finally { setSaving(false) }
  }

  const revoke = async (id: string) => {
    if (!confirm("ถอนสิทธิ์?")) return
    await fetch(`/api/branch-eval/permissions?id=${id}`, { method: "DELETE" })
    toast.success("ถอนแล้ว"); await load()
  }

  const counts = {
    admin: perms.filter(p => p.role === "branch_eval_admin").length,
    sup: perms.filter(p => p.role === "branch_eval_supervisor").length,
    ev: perms.filter(p => p.role === "branch_eval_evaluator").length,
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4 pb-32">
      <Link href="/app/branch-eval/manage" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> จัดการระบบ
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">สิทธิ์ระบบประเมินสาขา</h2>
          <p className="text-slate-400 text-sm">Admin {counts.admin} · Supervisor {counts.sup} · Evaluator {counts.ev}</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm">
          <Plus size={14} /> เพิ่มสิทธิ์
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <Th>พนักงาน</Th><Th>บทบาท</Th><Th>สาขา</Th><Th>มอบเมื่อ</Th><Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {perms.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar emp={p.employee} />
                    <div>
                      <p className="font-bold">{p.employee?.first_name_th} {p.employee?.last_name_th}
                        {p.employee?.nickname && <span className="text-xs text-slate-400 ml-1.5">({p.employee.nickname})</span>}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {p.employee?.employee_code} · {p.employee?.department?.name ?? "—"} · {p.employee?.position?.name ?? "—"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    p.role === "branch_eval_admin" ? "bg-rose-100 text-rose-700"
                    : p.role === "branch_eval_supervisor" ? "bg-amber-100 text-amber-700"
                    : "bg-sky-100 text-sky-700"
                  }`}>
                    {p.role === "branch_eval_admin" ? "🛡 Admin"
                     : p.role === "branch_eval_supervisor" ? "👁 Supervisor"
                     : "📝 Evaluator"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{p.branch?.name ?? <span className="text-slate-400 italic">ทุกสาขา</span>}</td>
                <td className="px-4 py-3 text-[11px] text-slate-500">{new Date(p.granted_at).toLocaleDateString("th-TH")}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => revoke(p.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={13} /></button>
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

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} />
                <h3 className="font-black">เพิ่มสิทธิ์ระบบประเมินสาขา</h3>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
            </div>

            <div className="px-5 pt-4 space-y-3">
              {/* Role */}
              <div>
                <p className="text-xs font-black text-slate-600 mb-1.5">บทบาท</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setRole("branch_eval_admin"); setBranchId("") }}
                    className={`p-3 rounded-xl border-2 text-left transition ${role === "branch_eval_admin" ? "border-rose-400 bg-rose-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className="font-bold text-sm">🛡 Admin</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">CRUD ทุกอย่าง / templates</p>
                  </button>
                  <button onClick={() => setRole("branch_eval_supervisor")}
                    className={`p-3 rounded-xl border-2 text-left transition ${role === "branch_eval_supervisor" ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className="font-bold text-sm">👁 Supervisor</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">ดูแลสาขา + รีวิว + มอบ evaluator</p>
                  </button>
                  <button onClick={() => setRole("branch_eval_evaluator")}
                    className={`p-3 rounded-xl border-2 text-left transition ${role === "branch_eval_evaluator" ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <p className="font-bold text-sm">📝 Evaluator</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">กรอกฟอร์มอย่างเดียว · เห็นแค่ของตัวเอง</p>
                  </button>
                </div>
              </div>

              {role !== "branch_eval_admin" && (
                <div>
                  <p className="text-xs font-black text-slate-600 mb-1.5">เลือกสาขา *</p>
                  <select value={branchId} onChange={e => setBranchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400">
                    <option value="">— เลือกสาขา —</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                  </select>
                </div>
              )}

              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหา ชื่อ / รหัส / แผนก / ตำแหน่ง..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-3 min-h-0">
              {employees.length === 0 ? (
                <div className="py-12 text-center text-slate-400"><Loader2 size={20} className="mx-auto animate-spin" /></div>
              ) : filteredEmps.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <Users size={28} className="mx-auto mb-2 text-slate-200" />
                  ไม่พบพนักงาน
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {filteredEmps.map(e => {
                    const isPicked = selected.has(e.id)
                    return (
                      <label key={e.id}
                        className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer border-2 transition ${
                          isPicked ? "bg-indigo-50 border-indigo-300" : "bg-white border-slate-100 hover:border-indigo-200"
                        }`}>
                        <input type="checkbox" checked={isPicked} onChange={() => toggle(e.id)}
                          className="w-4 h-4 accent-indigo-500" />
                        <Avatar emp={e} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{e.first_name_th} {e.last_name_th}
                            {e.nickname && <span className="text-slate-400 font-normal ml-1">({e.nickname})</span>}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                            <span>{e.employee_code}</span>
                            {e.department?.name && <><span>·</span><Building2 size={9} /><span className="truncate">{e.department.name}</span></>}
                            {e.position?.name && <><span>·</span><Briefcase size={9} /><span className="truncate">{e.position.name}</span></>}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 justify-end">
              {selected.size > 0 && (
                <span className="px-2.5 py-1 bg-indigo-500 text-white rounded-full text-[11px] font-black flex items-center gap-1">
                  <CheckCircle2 size={11} /> เลือก {selected.size} คน
                </span>
              )}
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50">ยกเลิก</button>
              <button onClick={grant} disabled={saving || selected.size === 0}
                className="px-4 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-40 inline-flex items-center gap-1.5">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                เพิ่ม
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ children }: any) {
  return <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">{children}</th>
}
function Avatar({ emp }: { emp: any }) {
  if (!emp) return null
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center font-black text-[10px] overflow-hidden border border-white shadow-sm flex-shrink-0">
      {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : (emp.first_name_th?.[0] ?? "?")}
    </div>
  )
}
