"use client"
import { useEffect, useState } from "react"
import { ShieldCheck, Plus, Trash2, X, Loader2, Search } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"

export default function TrainingPermissionsPage() {
  const supabase = createClient()
  const [perms, setPerms] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ employee_id: "", role: "training_admin", channel_id: "" })
  const [search, setSearch] = useState("")

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
    if (!showAdd) return
    supabase.from("employees").select("id, first_name_th, last_name_th, nickname, employee_code, position:positions(name), department:departments(name)")
      .eq("is_active", true).order("first_name_th").limit(500)
      .then(({ data }) => setEmployees(data ?? []))
  }, [showAdd])

  const grant = async () => {
    if (!form.employee_id || !form.role) { toast.error("เลือกพนักงานและบทบาท"); return }
    if (form.role === "training_supervisor" && !form.channel_id) { toast.error("เลือก channel"); return }
    const res = await fetch("/api/training/permissions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (!res.ok) { toast.error(d.error); return }
    toast.success("เพิ่มสิทธิ์แล้ว")
    setShowAdd(false); setForm({ employee_id: "", role: "training_admin", channel_id: "" })
    await load()
  }

  const revoke = async (id: string) => {
    if (!confirm("ถอนสิทธิ์?")) return
    await fetch(`/api/training/permissions?id=${id}`, { method: "DELETE" })
    toast.success("ถอนแล้ว"); await load()
  }

  const filtered = employees.filter(e => {
    if (!search) return true
    const s = search.toLowerCase()
    return `${e.first_name_th} ${e.last_name_th} ${e.nickname || ""} ${e.employee_code}`.toLowerCase().includes(s)
  })

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <a href="/admin/training" className="text-sm text-slate-400 hover:text-slate-700 inline-flex items-center gap-1">
            <ShieldCheck size={14} /> ระบบเรียนรู้
          </a>
          <span className="text-slate-300">›</span>
          <h1 className="text-xl lg:text-2xl font-black text-slate-800">สิทธิ์ Admin / Supervisor</h1>
          <span className="text-xs text-slate-400">({perms.length} คน)</span>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl text-sm font-bold shadow-sm transition-all">
          <Plus size={14} /> เพิ่มสิทธิ์
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500">พนักงาน</th>
              <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500">บทบาท</th>
              <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500">Channel</th>
              <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500">มอบเมื่อ</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {perms.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-bold">{p.employee?.first_name_th} {p.employee?.last_name_th}</p>
                  <p className="text-[10px] text-slate-400">{p.employee?.employee_code} · {p.employee?.position?.name}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.role === "training_admin" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {p.role === "training_admin" ? "Training Admin" : "Supervisor"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{p.channel?.name || <span className="text-slate-400">ทั้งหมด</span>}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{new Date(p.granted_at).toLocaleDateString("th-TH")}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => revoke(p.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {perms.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                <ShieldCheck size={32} className="mx-auto mb-2 text-slate-200" />
                ยังไม่มีคนที่ได้สิทธิ์
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-800">เพิ่มสิทธิ์</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">บทบาท</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setForm(f => ({ ...f, role: "training_admin", channel_id: "" }))}
                  className={`p-3 rounded-lg border-2 text-left ${form.role === "training_admin" ? "border-rose-400 bg-rose-50" : "border-slate-200"}`}>
                  <p className="font-bold text-sm">Training Admin</p>
                  <p className="text-[10px] text-slate-500">เห็น/แก้ทุก channel</p>
                </button>
                <button onClick={() => setForm(f => ({ ...f, role: "training_supervisor" }))}
                  className={`p-3 rounded-lg border-2 text-left ${form.role === "training_supervisor" ? "border-amber-400 bg-amber-50" : "border-slate-200"}`}>
                  <p className="font-bold text-sm">Supervisor</p>
                  <p className="text-[10px] text-slate-500">เฉพาะ channel ของตัวเอง</p>
                </button>
              </div>
            </div>

            {form.role === "training_supervisor" && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">เลือก Channel *</p>
                <select value={form.channel_id} onChange={e => setForm(f => ({ ...f, channel_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400">
                  <option value="">— เลือก —</option>
                  {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">พนักงาน</p>
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-sm outline-none focus:border-sky-400" />
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {filtered.map(e => (
                  <label key={e.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer">
                    <input type="radio" name="emp" value={e.id} checked={form.employee_id === e.id} onChange={() => setForm(f => ({ ...f, employee_id: e.id }))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold">{e.first_name_th} {e.last_name_th}</p>
                      <p className="text-[10px] text-slate-400">{e.employee_code}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg">ยกเลิก</button>
              <button onClick={grant} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700">เพิ่มสิทธิ์</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
