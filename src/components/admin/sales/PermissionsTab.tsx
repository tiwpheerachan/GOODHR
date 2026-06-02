"use client"
import { useEffect, useState, useMemo } from "react"
import {
  Shield, Plus, Trash2, Search, Users, X, Check, Loader2,
  ChevronRight, AlertCircle, ShieldCheck, ShieldAlert, UserPlus,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th } from "date-fns/locale"

type Access = "admin" | "manager" | "staff"
const LEVEL_LABEL: Record<Access, { label: string; desc: string; color: string; icon: any }> = {
  admin:   { label: "Admin",   desc: "ดูทั้งหมด · จัดการ products · กำหนดสิทธิ์",            color: "from-rose-500 to-pink-500",      icon: ShieldCheck },
  manager: { label: "Manager", desc: "ดูทีมตนเอง · จัดการ products · ไม่ตั้งสิทธิ์ได้",      color: "from-amber-500 to-orange-500",   icon: Shield },
  staff:   { label: "Staff",   desc: "สแกนขายได้ · ดูยอดของตัวเอง",                            color: "from-emerald-500 to-teal-500",   icon: Users },
}

export default function PermissionsTab() {
  const [perms, setPerms] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [myAccess, setMyAccess] = useState<Access | "none">("none")
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [q, setQ] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/product-sale-permissions?include_candidates=1")
      const d = await res.json()
      if (res.ok) {
        setPerms(d.permissions ?? [])
        setCandidates(d.candidates ?? [])
        setMyAccess(d.my_access)
      } else toast.error(d.error || "โหลดไม่สำเร็จ")
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!q.trim()) return perms
    const s = q.toLowerCase()
    return perms.filter(p => {
      const e = p.employee
      if (!e) return false
      return [e.first_name_th, e.last_name_th, e.nickname, e.employee_code, e.position?.name].some((x: string) => (x || "").toLowerCase().includes(s))
    })
  }, [perms, q])

  const grouped = useMemo(() => {
    const out: Record<Access, any[]> = { admin: [], manager: [], staff: [] }
    for (const p of filtered) {
      if (p.access_level && out[p.access_level as Access]) out[p.access_level as Access].push(p)
    }
    return out
  }, [filtered])

  if (myAccess !== "admin") {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
        <ShieldAlert size={32} className="mx-auto mb-3 text-rose-400"/>
        <p className="font-black text-slate-700">ต้องเป็น Admin เท่านั้น</p>
        <p className="text-xs text-slate-400 mt-1">จัดการสิทธิ์ได้เฉพาะผู้ที่มีระดับ admin</p>
      </div>
    )
  }

  const updateLevel = async (id: string, level: Access) => {
    const res = await fetch("/api/product-sale-permissions", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, access_level: level }),
    })
    if (res.ok) { toast.success("อัพเดตสิทธิ์แล้ว"); load() }
    else { const d = await res.json(); toast.error(d.error || "ไม่สำเร็จ") }
  }
  const removePerm = async (p: any) => {
    if (!confirm(`ยกเลิกสิทธิ์ของ ${p.employee?.first_name_th || ""}?`)) return
    const res = await fetch(`/api/product-sale-permissions?id=${p.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("ยกเลิกแล้ว"); load() }
    else toast.error("ลบไม่สำเร็จ")
  }

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-purple-500 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur"><Shield size={22}/></div>
          <div className="flex-1">
            <h2 className="text-xl font-black">สิทธิ์การเข้าถึงระบบขายสินค้า</h2>
            <p className="text-[11px] opacity-90 mt-0.5">กำหนดว่าใครเป็น admin / manager / staff (ขายสินค้า)</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-black rounded-xl flex items-center gap-1.5 shadow">
            <UserPlus size={14}/> เพิ่มผู้ใช้
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <BadgeTile color="rose" label="Admin" count={grouped.admin.length}/>
          <BadgeTile color="amber" label="Manager" count={grouped.manager.length}/>
          <BadgeTile color="emerald" label="Staff" count={grouped.staff.length}/>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-2">
        <Search size={14} className="text-slate-400 ml-1"/>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="ค้นพนักงาน (ชื่อ/รหัส/ตำแหน่ง)..."
          className="flex-1 bg-transparent outline-none text-sm"/>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-sm text-slate-400 border border-slate-100">
          <Loader2 size={20} className="animate-spin mx-auto mb-2 text-indigo-400"/>
          กำลังโหลด...
        </div>
      ) : perms.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-sm text-slate-400 border border-slate-100">
          <Shield size={28} className="mx-auto mb-2 text-slate-300"/>
          ยังไม่มีพนักงานที่ได้รับสิทธิ์ — กด <b>+ เพิ่มผู้ใช้</b> เพื่อเริ่ม
          <p className="text-[10px] mt-1">หมายเหตุ: super_admin / hr_admin จะมีสิทธิ์ Admin โดยอัตโนมัติ (ไม่ต้องเพิ่มที่นี่)</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {(["admin", "manager", "staff"] as Access[]).map(lvl => {
            const meta = LEVEL_LABEL[lvl]
            const Icon = meta.icon
            return (
              <div key={lvl} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className={`bg-gradient-to-br ${meta.color} text-white px-4 py-3 flex items-center gap-2`}>
                  <Icon size={16}/>
                  <p className="font-black text-sm flex-1">{meta.label}</p>
                  <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded-full font-black">{grouped[lvl].length}</span>
                </div>
                <p className="text-[10px] text-slate-500 px-4 py-2 bg-slate-50 border-b border-slate-100">{meta.desc}</p>
                <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
                  {grouped[lvl].length === 0 ? (
                    <p className="p-6 text-center text-xs text-slate-400">ไม่มีผู้ใช้ใน{meta.label}</p>
                  ) : grouped[lvl].map((p: any) => (
                    <PermissionRow key={p.id} perm={p}
                      onChange={(v: Access) => updateLevel(p.id, v)}
                      onRemove={() => removePerm(p)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddPermissionModal
          candidates={candidates}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}

function BadgeTile({ color, label, count }: any) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5">
      <p className="text-[10px] uppercase opacity-90 font-bold">{label}</p>
      <p className="text-2xl font-black mt-0.5">{count}</p>
    </div>
  )
}

function PermissionRow({ perm, onChange, onRemove }: any) {
  const e = perm.employee
  if (!e) return null
  return (
    <div className="px-3 py-2.5 hover:bg-slate-50 flex items-center gap-2">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 overflow-hidden flex-shrink-0">
        {e.avatar_url
          ? <img src={e.avatar_url} alt="" className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-white text-xs font-black">{e.first_name_th?.[0]}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate">
          {e.nickname || `${e.first_name_th} ${e.last_name_th}`}
        </p>
        <p className="text-[10px] text-slate-400 truncate">
          {e.employee_code} {e.position?.name && `· ${e.position.name}`}
        </p>
        {perm.granter && (
          <p className="text-[9px] text-slate-400">
            ให้สิทธิ์โดย {perm.granter.nickname || perm.granter.first_name_th} · {format(new Date(perm.granted_at), "d MMM yy", { locale: th })}
          </p>
        )}
      </div>
      <select value={perm.access_level} onChange={(ev) => onChange(ev.target.value)}
        className="bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] font-bold outline-none focus:border-indigo-400">
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="staff">Staff</option>
      </select>
      <button onClick={onRemove} className="p-1.5 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg" title="ยกเลิกสิทธิ์">
        <Trash2 size={11}/>
      </button>
    </div>
  )
}

function AddPermissionModal({ candidates: initialCandidates, onClose, onAdded }: any) {
  const [q, setQ] = useState("")
  const [selected, setSelected] = useState<any>(null)
  const [level, setLevel] = useState<Access>("staff")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<any[]>(initialCandidates ?? [])
  const [searching, setSearching] = useState(false)

  // ── debounced server-side search ──
  useEffect(() => {
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ include_candidates: "1", limit: q.trim() ? "100" : "30" })
      if (q.trim()) params.set("search", q.trim())
      setSearching(true)
      try {
        const res = await fetch(`/api/product-sale-permissions?${params}`)
        const d = await res.json()
        setResults(d.candidates ?? [])
      } finally { setSearching(false) }
    }, q.trim() ? 250 : 0)
    return () => clearTimeout(t)
  }, [q])

  const filtered = results

  const grant = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch("/api/product-sale-permissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: selected.id, access_level: level, note: note || null }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ไม่สำเร็จ"); return }
      toast.success("ให้สิทธิ์เรียบร้อย")
      onAdded()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-between">
          <p className="font-black flex items-center gap-2"><UserPlus size={16}/> เพิ่มผู้ใช้ใหม่</p>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* selected? */}
          {selected ? (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 overflow-hidden flex-shrink-0">
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt="" className="w-full h-full object-cover"/>
                  : <div className="w-full h-full flex items-center justify-center text-white text-base font-black">{selected.first_name_th?.[0]}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{selected.first_name_th} {selected.last_name_th}</p>
                <p className="text-[10px] text-slate-500 truncate">{selected.employee_code} {selected.position?.name && `· ${selected.position.name}`}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 bg-white hover:bg-emerald-50 rounded-lg text-rose-500">
                <X size={14}/>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 border-2 border-slate-200 focus-within:border-rose-400 transition">
                <Search size={15} className="text-slate-400"/>
                <input value={q} onChange={e => setQ(e.target.value)} autoFocus
                  placeholder="พิมพ์ชื่อจริง / ชื่อเล่น / รหัสพนักงาน / ตำแหน่ง..."
                  className="flex-1 bg-transparent outline-none text-sm font-bold"/>
                {searching ? (
                  <Loader2 size={13} className="animate-spin text-rose-400"/>
                ) : q && (
                  <button onClick={() => setQ("")} className="p-0.5 hover:bg-slate-200 rounded">
                    <X size={12} className="text-slate-400"/>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 px-1">
                {q ? `พบ ${filtered.length} ราย` : `แสดง ${filtered.length} คนแรก · พิมพ์เพื่อค้นเพิ่ม`}
              </p>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl bg-white">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users size={28} className="mx-auto mb-2 text-slate-300"/>
                    <p className="text-xs text-slate-400">{q ? `ไม่พบ "${q}"` : "ไม่พบพนักงานที่ยังไม่ได้รับสิทธิ์"}</p>
                    <p className="text-[10px] text-slate-400 mt-1">ลองค้นด้วยรหัส หรือชื่อเล่น</p>
                  </div>
                ) : filtered.map((e: any) => {
                  const fullName = `${e.first_name_th} ${e.last_name_th}`
                  return (
                    <button key={e.id} onClick={() => setSelected(e)}
                      className="w-full text-left p-3 hover:bg-rose-50/40 flex items-center gap-3 group transition">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
                        {e.avatar_url
                          ? <img src={e.avatar_url} alt="" className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center text-white text-sm font-black">{e.first_name_th?.[0]}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 truncate">
                          {fullName}
                          {e.nickname && <span className="ml-1 text-[10px] text-rose-500 font-bold">({e.nickname})</span>}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {e.employee_code && (
                            <span className="text-[9px] font-mono font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{e.employee_code}</span>
                          )}
                          {e.position?.name && (
                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{e.position.name}</span>
                          )}
                          {e.department?.name && (
                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{e.department.name}</span>
                          )}
                          {e.branch?.name && (
                            <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">📍 {e.branch.name}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition"/>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Level picker */}
          {selected && (
            <>
              <p className="text-[10px] font-black text-slate-500 uppercase pt-2">เลือกระดับสิทธิ์</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(LEVEL_LABEL) as Access[]).map(lvl => {
                  const meta = LEVEL_LABEL[lvl]
                  const Icon = meta.icon
                  return (
                    <button key={lvl} onClick={() => setLevel(lvl)}
                      className={"p-3 rounded-xl border-2 text-left transition-all " +
                        (level === lvl ? `border-transparent bg-gradient-to-br ${meta.color} text-white shadow` : "border-slate-200 bg-white hover:border-indigo-300")}>
                      <Icon size={16} className={level === lvl ? "text-white" : "text-slate-500"}/>
                      <p className={"font-black text-sm mt-1 " + (level === lvl ? "text-white" : "text-slate-800")}>{meta.label}</p>
                      <p className={"text-[9px] mt-1 leading-tight " + (level === lvl ? "text-white/80" : "text-slate-500")}>{meta.desc}</p>
                    </button>
                  )
                })}
              </div>

              <label className="block">
                <span className="text-[10px] font-black text-slate-500 uppercase">หมายเหตุ (ไม่บังคับ)</span>
                <input value={note} onChange={e => setNote(e.target.value)}
                  placeholder="เช่น PC สาขา Central Pinklao"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-400"/>
              </label>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl">ยกเลิก</button>
          <button onClick={grant} disabled={!selected || saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            ให้สิทธิ์
          </button>
        </div>
      </div>
    </div>
  )
}
