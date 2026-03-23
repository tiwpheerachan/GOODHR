"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import {
  Users, Search, X, Edit2, Save, MapPin, Clock, Phone, Mail, Plus, Trash2,
  Shield, User, Building2, Check, Loader2, ChevronDown, Network, ExternalLink,
} from "lucide-react"
import toast from "react-hot-toast"

// ── Types ──
interface Emp {
  id: string; employee_code: string; first_name_th: string; last_name_th: string
  nickname: string; email: string; phone: string; avatar_url: string
  supervisor_id: string | null; department_id: string; position_id: string; branch_id: string
  company_id: string | null
  department: { id: string; name: string } | null
  position: { id: string; name: string } | null
  branch: { id: string; name: string } | null
  schedule_profile: any; allowed_locations: any[]
}
interface Dept { id: string; name: string }

// ── Colors for departments ──
const DEPT_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-200", header: "bg-blue-600", badge: "bg-blue-100 text-blue-700" },
  { bg: "bg-emerald-50", border: "border-emerald-200", header: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  { bg: "bg-violet-50", border: "border-violet-200", header: "bg-violet-600", badge: "bg-violet-100 text-violet-700" },
  { bg: "bg-amber-50", border: "border-amber-200", header: "bg-amber-600", badge: "bg-amber-100 text-amber-700" },
  { bg: "bg-rose-50", border: "border-rose-200", header: "bg-rose-600", badge: "bg-rose-100 text-rose-700" },
  { bg: "bg-cyan-50", border: "border-cyan-200", header: "bg-cyan-600", badge: "bg-cyan-100 text-cyan-700" },
  { bg: "bg-pink-50", border: "border-pink-200", header: "bg-pink-600", badge: "bg-pink-100 text-pink-700" },
  { bg: "bg-indigo-50", border: "border-indigo-200", header: "bg-indigo-600", badge: "bg-indigo-100 text-indigo-700" },
]

const shiftLabel = (e: Emp) => {
  const p = Array.isArray(e.schedule_profile) ? e.schedule_profile?.[0] : e.schedule_profile
  if (!p) return null
  const s = p.default_shift
  return s ? `${s.work_start?.slice(0,5)}-${s.work_end?.slice(0,5)}` : (p.schedule_type === "variable" ? "ไม่แน่นอน" : null)
}

const locNames = (e: Emp) => (e.allowed_locations?.map((l: any) => l.branch?.name).filter(Boolean) || []).join(", ")

export default function OrgMapPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const isSA = user?.role === "super_admin" || user?.role === "hr_admin"

  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCo, setSelectedCo] = useState("")
  const [employees, setEmployees] = useState<Emp[]>([])
  const [departments, setDepartments] = useState<Dept[]>([])
  const [allBranches, setAllBranches] = useState<{ id: string; name: string }[]>([])
  const [allPositions, setAllPositions] = useState<{ id: string; name: string }[]>([])
  const [allEmpsForSup, setAllEmpsForSup] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Emp | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [addLocBranch, setAddLocBranch] = useState("")
  const [dragEmpId, setDragEmpId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null) // "dept:xxx" or "mgr:xxx"

  useEffect(() => {
    if (!isSA) return
    supabase.from("companies").select("id,name_th,code").eq("is_active", true).order("name_th")
      .then(({ data }) => { setCompanies(data ?? []); setSelectedCo("all") })
  }, [isSA])

  const load = useCallback(async () => {
    if (!selectedCo) return
    setLoading(true)
    try {
      const res = await fetch(`/api/org?company_id=${selectedCo}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEmployees(data.employees ?? [])
      setDepartments(data.departments ?? [])
      setAllBranches(data.branches ?? [])
      setAllPositions(data.positions ?? [])
      setAllEmpsForSup(data.allEmployees ?? [])
    } catch (e: any) {
      console.error("Load org error:", e)
      toast.error("โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [selectedCo])

  useEffect(() => { load() }, [load])

  // ── Build hierarchy: ฝ่าย → แผนก → หัวหน้า → ลูกน้อง ──
  // Group employees by ฝ่าย (department)
  // Then within each department, find managers and their subordinates

  const buildManagerGroups = (members: Emp[]) => {
    // Use ALL employees (not just dept members) to find who is a manager
    const managerIds = new Set<string>()

    // Anyone whose ID is referenced as supervisor_id by a dept member
    members.forEach(m => {
      if (m.supervisor_id) {
        // Check if supervisor is in THIS department
        const supInDept = members.find(e => e.id === m.supervisor_id)
        if (supInDept) managerIds.add(m.supervisor_id)
      }
    })

    // Also: anyone in this dept who HAS subordinates (even cross-dept)
    members.forEach(m => {
      if (employees.some(e => e.supervisor_id === m.id)) {
        managerIds.add(m.id)
      }
    })

    // Also include people with manager/lead/หัวหน้า in position
    members.forEach(m => {
      const pos = (m.position?.name || "").toLowerCase()
      if (pos.includes("manager") || pos.includes("lead") || pos.includes("หัวหน้า") || pos.includes("head") || pos.includes("director") || pos.includes("supervisor") || pos.includes("team lead")) {
        managerIds.add(m.id)
      }
    })

    // Build groups
    const groups: { manager: Emp; subordinates: Emp[] }[] = []
    const assigned: Record<string, boolean> = {}

    Array.from(managerIds).forEach(mgId => {
      const mg = members.find(m => m.id === mgId)
      if (!mg) return
      // Get subordinates: people in THIS dept whose supervisor_id = mgId
      const subs = members.filter(m => m.supervisor_id === mgId && m.id !== mgId)
      groups.push({ manager: mg, subordinates: subs })
      assigned[mgId] = true
      subs.forEach(s => { assigned[s.id] = true })
    })

    // People who have supervisor_id pointing to someone OUTSIDE this dept → show under "หัวหน้าอื่นแผนก"
    const crossDeptSubs = members.filter(m =>
      !assigned[m.id] && m.supervisor_id && !members.some(e => e.id === m.supervisor_id)
    )
    if (crossDeptSubs.length > 0) {
      // Group by their actual supervisor
      const crossGroups: Record<string, Emp[]> = {}
      crossDeptSubs.forEach(m => {
        const supId = m.supervisor_id!
        if (!crossGroups[supId]) crossGroups[supId] = []
        crossGroups[supId].push(m)
      })
      for (const [supId, subs] of Object.entries(crossGroups)) {
        const sup = employees.find(e => e.id === supId)
        if (sup) {
          groups.push({ manager: sup, subordinates: subs })
          subs.forEach(s => { assigned[s.id] = true })
        }
      }
    }

    const unassigned = members.filter(m => !assigned[m.id])
    return { groups, unassigned }
  }

  const deptData = departments.map((dept, idx) => {
    const members = employees.filter(e => e.department_id === dept.id)
    const { groups, unassigned } = buildManagerGroups(members)
    const color = DEPT_COLORS[idx % DEPT_COLORS.length]
    return { dept, members, groups, unassigned, color }
  }).filter(d => d.members.length > 0)

  const noDepMembers = employees.filter(e => !e.department_id)

  // Search filter
  const matchSearch = (e: Emp) => {
    if (!search) return true
    const s = search.toLowerCase()
    return `${e.first_name_th} ${e.last_name_th} ${e.nickname} ${e.employee_code} ${e.position?.name}`.toLowerCase().includes(s)
  }

  // Save edit
  const saveEdit = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch("/api/org", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: selected.id, updates: editForm }),
      })
      const data = await res.json()
      if (data.success) { toast.success("บันทึกแล้ว"); setEditing(false); load() }
      else toast.error(data.error)
    } catch (e: any) {
      console.error("Save error:", e)
      toast.error("บันทึกไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  // ── Mini Card ──
  const MiniCard = ({ e, isManager = false }: { e: Emp; isManager?: boolean }) => {
    if (!matchSearch(e)) return null
    const isActive = selected?.id === e.id
    const isDragging = dragEmpId === e.id
    return (
      <div
        draggable
        onDragStart={() => onDragStart(e.id)}
        onDragEnd={onDragEnd}
        onClick={() => { setSelected(e); setEditing(false) }}
        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-grab active:cursor-grabbing transition-all ${
          isDragging ? "opacity-30 scale-95" : ""
        } ${isActive ? "bg-white ring-2 ring-indigo-500 shadow-lg scale-[1.02]" : "bg-white/70 hover:bg-white hover:shadow-md"
        } ${isManager ? "border-l-3 border-l-amber-400" : ""}`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 overflow-hidden ${
          isManager ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-2 ring-amber-300" : "bg-gradient-to-br from-slate-500 to-slate-700 text-white"
        }`}>
          {e.avatar_url ? <img src={e.avatar_url} className="w-full h-full object-cover"/> : e.first_name_th?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">
            {e.first_name_th} {e.last_name_th?.slice(0,1)}.
            {isManager && <Shield size={9} className="inline ml-1 text-amber-500"/>}
          </p>
          <p className="text-[9px] text-slate-400 truncate">{e.position?.name || e.employee_code}</p>
        </div>
      </div>
    )
  }

  // ── Manager Group Card ──
  const ManagerGroup = ({ manager, subordinates, color }: { manager: Emp; subordinates: Emp[]; color: any }) => {
    const filteredSubs = subordinates.filter(matchSearch)
    const showManager = matchSearch(manager)
    if (!showManager && filteredSubs.length === 0) return null

    const isDragTarget = dragOverTarget === `mgr:${manager.id}`
    return (
      <div
        onDragOver={ev => onDragOverZone(`mgr:${manager.id}`, ev)}
        onDragLeave={() => setDragOverTarget(null)}
        onDrop={() => onDropZone(`mgr:${manager.id}`)}
        className={`rounded-xl border-2 border-dashed p-2.5 space-y-1.5 transition-all ${
          isDragTarget ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200 scale-[1.01]" : color.border
        }`}
      >
        {/* Manager header */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-6 h-6 rounded-md ${color.header} flex items-center justify-center`}>
            <Shield size={10} className="text-white"/>
          </div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
            {manager.first_name_th} {manager.nickname ? `(${manager.nickname})` : ""}
            <span className="text-slate-400 font-normal ml-1">· {subordinates.length} คน</span>
          </p>
        </div>

        {/* Manager card */}
        {showManager && <MiniCard e={manager} isManager/>}

        {/* Subordinates */}
        {filteredSubs.map(s => <MiniCard key={s.id} e={s}/>)}
      </div>
    )
  }

  // ── API helpers ──
  const apiOrg = async (body: any) => {
    const res = await fetch("/api/org", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    return res.json()
  }

  const changeSupervisor = async (empId: string, newSupId: string | null) => {
    setSaving(true)
    try {
      const r = await apiOrg({ action: "update_employee", employee_id: empId, updates: { supervisor_id: newSupId || null } })
      if (r.success) { toast.success("เปลี่ยนหัวหน้าแล้ว"); load() } else toast.error(r.error)
    } catch { toast.error("ดำเนินการไม่สำเร็จ") } finally { setSaving(false) }
  }

  const changeDepartment = async (empId: string, newDeptId: string | null) => {
    setSaving(true)
    try {
      const r = await apiOrg({ action: "update_employee", employee_id: empId, updates: { department_id: newDeptId || null } })
      if (r.success) { toast.success("ย้ายแผนกแล้ว"); load() } else toast.error(r.error)
    } catch { toast.error("ดำเนินการไม่สำเร็จ") } finally { setSaving(false) }
  }

  const changePosition = async (empId: string, newPosId: string | null) => {
    setSaving(true)
    try {
      const r = await apiOrg({ action: "update_employee", employee_id: empId, updates: { position_id: newPosId || null } })
      if (r.success) { toast.success("เปลี่ยนตำแหน่งแล้ว"); load() } else toast.error(r.error)
    } catch { toast.error("ดำเนินการไม่สำเร็จ") } finally { setSaving(false) }
  }

  // Assign multiple subordinates to a manager
  const assignSubordinates = async (managerId: string, empIds: string[]) => {
    setSaving(true)
    let ok = 0
    for (const eid of empIds) {
      const r = await apiOrg({ action: "update_employee", employee_id: eid, updates: { supervisor_id: managerId } })
      if (r.success) ok++
    }
    setSaving(false)
    toast.success(`กำหนดลูกน้อง ${ok} คน สำเร็จ`)
    load()
  }

  // Transfer all subordinates from old manager to new
  const transferTeam = async (fromMgrId: string, toMgrId: string) => {
    const subs = employees.filter(e => e.supervisor_id === fromMgrId)
    if (!subs.length) { toast.error("ไม่มีลูกน้องให้ย้าย"); return }
    if (!confirm(`ย้ายลูกน้อง ${subs.length} คน จากหัวหน้าเดิมไปยังหัวหน้าใหม่?`)) return
    await assignSubordinates(toMgrId, subs.map(s => s.id))
  }

  // Drag & Drop handlers
  const onDragStart = (empId: string) => setDragEmpId(empId)
  const onDragEnd = () => { setDragEmpId(null); setDragOverTarget(null) }
  const onDragOverZone = (target: string, ev: React.DragEvent) => { ev.preventDefault(); setDragOverTarget(target) }

  const onDropZone = async (target: string) => {
    if (!dragEmpId) return
    const emp = employees.find(e => e.id === dragEmpId)
    if (!emp) { onDragEnd(); return }

    if (target.startsWith("dept:")) {
      // Drop on department → change department
      const deptId = target.slice(5)
      if (emp.department_id === deptId) { onDragEnd(); return }
      const deptName = departments.find(d => d.id === deptId)?.name
      if (confirm(`ย้าย ${emp.first_name_th} ไปแผนก "${deptName}"?`)) {
        await changeDepartment(emp.id, deptId)
      }
    } else if (target.startsWith("mgr:")) {
      // Drop on manager group → set supervisor
      const mgrId = target.slice(4)
      if (emp.supervisor_id === mgrId || emp.id === mgrId) { onDragEnd(); return }
      const mgr = employees.find(e => e.id === mgrId)
      if (confirm(`ตั้ง ${mgr?.first_name_th || ""} เป็นหัวหน้าของ ${emp.first_name_th}?`)) {
        await changeSupervisor(emp.id, mgrId)
        // Also move to same department if different
        if (mgr && mgr.department_id && mgr.department_id !== emp.department_id) {
          await changeDepartment(emp.id, mgr.department_id)
        }
      }
    }
    onDragEnd()
  }

  const addLocation = async (empId: string, branchId: string) => {
    setSaving(true)
    const r = await apiOrg({ action: "add_location", employee_id: empId, branch_id: branchId })
    setSaving(false)
    if (r.success) { toast.success("เพิ่มที่เช็คอินแล้ว"); load() } else toast.error(r.error)
  }

  const removeLocation = async (empId: string, branchId: string) => {
    if (!confirm("ลบสถานที่เช็คอินนี้?")) return
    setSaving(true)
    const r = await apiOrg({ action: "remove_location", employee_id: empId, branch_id: branchId })
    setSaving(false)
    if (r.success) { toast.success("ลบที่เช็คอินแล้ว"); load() } else toast.error(r.error)
  }

  // ── Detail Popup ──
  const DetailPopup = () => {
    if (!selected) return null
    const e = selected
    const shift = shiftLabel(e)
    const sup = employees.find(m => m.id === e.supervisor_id)
    const subs = employees.filter(m => m.supervisor_id === e.id)
    const empLocs = e.allowed_locations || []

    return (
      <div className="fixed bottom-4 right-4 w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-lg font-black overflow-hidden">
                {e.avatar_url ? <img src={e.avatar_url} className="w-full h-full object-cover"/> : e.first_name_th?.[0]}
              </div>
              <div>
                <p className="font-black text-sm">{e.first_name_th} {e.last_name_th}</p>
                <p className="text-[10px] text-white/70">{e.employee_code} {e.nickname ? `· ${e.nickname}` : ""}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/20 rounded-lg"><X size={16}/></button>
          </div>
          <p className="text-xs font-medium text-white/90 mt-1">{e.position?.name || "-"} · {e.department?.name || "-"}</p>
        </div>

        <div className="px-4 py-3 space-y-3 max-h-[60vh] overflow-y-auto">

          {/* ── 1. หัวหน้างาน (ทุกคนเปลี่ยนได้) ── */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Shield size={10}/> หัวหน้างาน
            </p>
            <select
              value={e.supervisor_id || ""}
              onChange={ev => changeSupervisor(e.id, ev.target.value)}
              disabled={saving}
              className="w-full bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 text-xs font-bold text-amber-800 outline-none focus:border-amber-400"
            >
              <option value="">— ไม่มีหัวหน้า —</option>
              {allEmpsForSup.filter(m => m.id !== e.id).map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.nickname ? `(${m.nickname})` : ""} · {m.position || ""} [{m.company}]
                </option>
              ))}
            </select>
          </div>

          {/* ── 1.5 แผนก + ตำแหน่ง (เปลี่ยนได้) ── */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building2 size={9}/> แผนก
              </p>
              <select
                value={e.department_id || ""}
                onChange={ev => changeDepartment(e.id, ev.target.value)}
                disabled={saving}
                className="w-full bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-blue-800 outline-none focus:border-blue-400"
              >
                <option value="">— ไม่ระบุ —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User size={9}/> ตำแหน่ง
              </p>
              <select
                value={e.position_id || ""}
                onChange={async ev => {
                  if (ev.target.value === "__new__") {
                    const name = prompt("ชื่อตำแหน่งใหม่:")
                    if (!name) { ev.target.value = e.position_id || ""; return }
                    setSaving(true)
                    const res = await fetch("/api/org", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "create_position", name, company_id: e.company_id }),
                    })
                    const data = await res.json()
                    setSaving(false)
                    if (data.position_id) {
                      await changePosition(e.id, data.position_id)
                    } else {
                      toast.error(data.error || "สร้างตำแหน่งไม่สำเร็จ")
                    }
                  } else {
                    changePosition(e.id, ev.target.value)
                  }
                }}
                disabled={saving}
                className="w-full bg-violet-50 border border-violet-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-violet-800 outline-none focus:border-violet-400"
              >
                <option value="">— ไม่ระบุ —</option>
                {allPositions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="__new__">+ เพิ่มตำแหน่งใหม่...</option>
              </select>
            </div>
          </div>

          {/* ── 2. ที่เช็คอิน (เพิ่ม/ลบได้) ── */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <MapPin size={10}/> สถานที่เช็คอิน ({empLocs.length})
            </p>
            <div className="space-y-1">
              {empLocs.map((loc: any) => (
                <div key={loc.branch_id} className="flex items-center gap-2 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                  <MapPin size={10} className="text-emerald-600 flex-shrink-0"/>
                  <p className="text-[11px] font-semibold text-emerald-800 flex-1 truncate">{loc.branch?.name || loc.branch_id}</p>
                  <button onClick={() => removeLocation(e.id, loc.branch_id)}
                    className="p-0.5 hover:bg-red-100 rounded text-red-400 hover:text-red-600 flex-shrink-0">
                    <X size={10}/>
                  </button>
                </div>
              ))}
            </div>
            {/* Add new location */}
            <div className="flex gap-1.5 mt-1.5">
              <select value={addLocBranch} onChange={ev => setAddLocBranch(ev.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] outline-none">
                <option value="">เลือกสาขาเพิ่ม...</option>
                {allBranches
                  .filter(b => !empLocs.some((l: any) => l.branch_id === b.id))
                  .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button onClick={() => { if (addLocBranch) { addLocation(e.id, addLocBranch); setAddLocBranch("") } }}
                disabled={!addLocBranch || saving}
                className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold disabled:opacity-30 hover:bg-emerald-700">
                <Plus size={10}/>
              </button>
            </div>
          </div>

          {/* ── 3. กะการทำงาน (ลิงก์ไปหน้ากะ) ── */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Clock size={10}/> กะการทำงาน
            </p>
            <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-2.5 py-2">
              <Clock size={12} className="text-blue-600"/>
              <p className="text-xs font-bold text-blue-800 flex-1">{shift || "ยังไม่กำหนด"}</p>
              <Link href="/admin/shifts" className="flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-800">
                จัดกะ <ExternalLink size={9}/>
              </Link>
            </div>
          </div>

          {/* ── 4. ข้อมูลติดต่อ ── */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">ข้อมูลติดต่อ</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { icon: Mail, l: "อีเมล", v: e.email },
                { icon: Phone, l: "เบอร์", v: e.phone },
                { icon: Building2, l: "สาขา", v: e.branch?.name },
              ].filter(i => i.v).map(i => (
                <div key={i.l} className="bg-slate-50 rounded-lg px-2 py-1.5">
                  <p className="text-[8px] font-bold text-slate-400 flex items-center gap-0.5"><i.icon size={8}/>{i.l}</p>
                  <p className="text-[10px] font-semibold text-slate-700 truncate">{i.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 5. ลูกน้อง ── */}
          {subs.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">ลูกน้อง ({subs.length})</p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {subs.map(s => (
                  <div key={s.id} onClick={() => { setSelected(s); setEditing(false) }}
                    className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center text-[8px] font-black overflow-hidden">
                      {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover"/> : s.first_name_th?.[0]}
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 truncate flex-1">{s.first_name_th} {s.last_name_th}</p>
                    <p className="text-[8px] text-slate-400">{s.position?.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. กำหนดลูกน้อง (เพิ่มคนเข้าทีม) ── */}
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Users size={10}/> กำหนดลูกน้อง (เพิ่มคนเข้าทีมของ {e.first_name_th})
            </p>
            <select
              onChange={ev => {
                const eid = ev.target.value
                if (!eid) return
                if (!confirm(`เพิ่ม ${employees.find(x => x.id === eid)?.first_name_th || ""} เป็นลูกน้องของ ${e.first_name_th}?`)) {
                  ev.target.value = ""
                  return
                }
                assignSubordinates(e.id, [eid]).then(() => { ev.target.value = "" })
              }}
              disabled={saving}
              className="w-full bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-indigo-800 outline-none"
            >
              <option value="">+ เลือกพนักงานเพิ่มเป็นลูกน้อง...</option>
              {employees
                .filter(m => m.id !== e.id && m.supervisor_id !== e.id)
                .sort((a, b) => a.first_name_th.localeCompare(b.first_name_th))
                .map(m => (
                  <option key={m.id} value={m.id}>
                    {m.first_name_th} {m.last_name_th} {m.nickname ? `(${m.nickname})` : ""} · {m.position?.name || ""} [{m.department?.name || "ไม่ระบุ"}]
                  </option>
                ))
              }
            </select>

            {/* Quick: รับทีมจากหัวหน้าอื่น */}
            {(() => {
              const otherManagers = employees.filter(m =>
                m.id !== e.id && employees.some(s => s.supervisor_id === m.id)
              )
              if (!otherManagers.length) return null
              return (
                <div className="mt-1.5">
                  <select
                    onChange={ev => {
                      const fromId = ev.target.value
                      if (!fromId) return
                      transferTeam(fromId, e.id).then(() => { ev.target.value = "" })
                    }}
                    disabled={saving}
                    className="w-full bg-rose-50 border border-rose-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-rose-800 outline-none"
                  >
                    <option value="">รับทีมทั้งหมดจากหัวหน้าอื่น...</option>
                    {otherManagers.map(m => {
                      const cnt = employees.filter(s => s.supervisor_id === m.id).length
                      return (
                        <option key={m.id} value={m.id}>
                          {m.first_name_th} {m.nickname ? `(${m.nickname})` : ""} · {cnt} ลูกน้อง [{m.department?.name || ""}]
                        </option>
                      )
                    })}
                  </select>
                </div>
              )
            })()}
          </div>

          {/* ── 7. แก้ไขข้อมูลพื้นฐาน ── */}
          <button
            onClick={() => { setEditing(!editing); setEditForm({ nickname: e.nickname, email: e.email, phone: e.phone }) }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200">
            <Edit2 size={11}/> {editing ? "ปิดการแก้ไข" : "แก้ไขข้อมูลพื้นฐาน"}
          </button>

          {editing && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              {[{ k: "nickname", l: "ชื่อเล่น" }, { k: "email", l: "อีเมล" }, { k: "phone", l: "เบอร์โทร" }].map(({ k, l }) => (
                <div key={k} className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-500 w-14">{l}</label>
                  <input value={editForm[k] || ""} onChange={ev => setEditForm(f => ({ ...f, [k]: ev.target.value }))}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-400"/>
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold">ยกเลิก</button>
                <button onClick={saveEdit} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold">
                  {saving ? <Loader2 size={10} className="animate-spin"/> : <Check size={10}/>} บันทึก
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const selectedCoName = companies.find(c => c.id === selectedCo)?.code || ""

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Network size={20} className="text-indigo-600"/> Organization Map
          </h2>
          <p className="text-[11px] text-slate-400">โครงสร้างองค์กร แบ่งตามฝ่าย → หัวหน้า → ลูกน้อง · คลิกดูรายละเอียด</p>
        </div>
        <div className="flex-1"/>
        {isSA && companies.length > 0 && (
          <select value={selectedCo} onChange={e => setSelectedCo(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold shadow-sm">
            <option value="all">ทุกบริษัท ({companies.length})</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name_th}</option>)}
          </select>
        )}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / รหัส..."
            className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-400 w-52"/>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 text-xs">
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">{selectedCoName} · {employees.length} คน</span>
        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">{deptData.length} แผนก</span>
        {deptData.map(d => (
          <span key={d.dept.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.color.badge}`}>
            {d.dept.name} ({d.members.length})
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 size={32} className="animate-spin text-indigo-400"/></div>
      ) : (
        <div className="overflow-x-auto pb-8">
          {/* Kanban-style horizontal scroll */}
          <div className="flex gap-4" style={{ minWidth: deptData.length * 340 }}>
            {deptData.map(({ dept, groups, unassigned, color, members }) => {
              const isDeptDragTarget = dragOverTarget === `dept:${dept.id}`
              return (
              <div key={dept.id}
                onDragOver={ev => onDragOverZone(`dept:${dept.id}`, ev)}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={() => onDropZone(`dept:${dept.id}`)}
                className={`w-[320px] flex-shrink-0 rounded-2xl border overflow-hidden transition-all ${
                  isDeptDragTarget ? "ring-4 ring-indigo-400 scale-[1.01] border-indigo-400" : `${color.bg} ${color.border}`
                }`}
              >
                {/* Department header */}
                <div className={`${color.header} px-4 py-3 text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm">{dept.name} {(dept as any).company?.code ? `[${(dept as any).company.code}]` : ""}</p>
                      <p className="text-[10px] text-white/70">{members.length} คน · {groups.length} หัวหน้า</p>
                    </div>
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg font-black">
                      {members.length}
                    </div>
                  </div>
                </div>

                {/* Manager groups */}
                <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
                  {groups.map(({ manager, subordinates }) => (
                    <ManagerGroup key={manager.id} manager={manager} subordinates={subordinates} color={color}/>
                  ))}

                  {/* Unassigned (no manager) */}
                  {unassigned.filter(matchSearch).length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white/50 p-2.5 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 px-1">ไม่มีหัวหน้า ({unassigned.filter(matchSearch).length})</p>
                      {unassigned.filter(matchSearch).map(e => <MiniCard key={e.id} e={e}/>)}
                    </div>
                  )}
                </div>
              </div>
              )
            })}

            {/* No department */}
            {noDepMembers.filter(matchSearch).length > 0 && (
              <div className="w-[320px] flex-shrink-0 rounded-2xl bg-slate-50 border border-dashed border-slate-300 overflow-hidden">
                <div className="bg-slate-500 px-4 py-3 text-white">
                  <p className="font-black text-sm">ไม่ระบุแผนก</p>
                  <p className="text-[10px] text-white/70">{noDepMembers.length} คน</p>
                </div>
                <div className="p-3 space-y-1.5 max-h-[70vh] overflow-y-auto">
                  {noDepMembers.filter(matchSearch).map(e => <MiniCard key={e.id} e={e}/>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail popup */}
      <DetailPopup/>
    </div>
  )
}
