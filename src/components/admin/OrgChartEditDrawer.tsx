"use client"
import { useEffect, useState, useRef } from "react"
import {
  X, Loader2, Users, ArrowUp, ArrowDown, Plus, Eye, BarChart2, Shield,
  Network, ExternalLink, UserPlus, Trash2, AlertCircle,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

type ChainData = {
  evaluators: {
    direct_manager: any | null
    skip_level: any | null
    additional: any[]
  }
  subordinates: {
    direct: any[]
    skip: any[]
    additional: any[]
  }
  stats: { total: number; direct_count: number; skip_count: number; additional_count: number }
}

const SCOPE_META: Record<string, { label: string; color: string; icon: any }> = {
  kpi:       { label: "ประเมิน KPI",       color: "bg-violet-50 text-violet-700 border-violet-200", icon: BarChart2 },
  probation: { label: "ประเมินทดลองงาน",   color: "bg-rose-50 text-rose-700 border-rose-200",       icon: Shield },
  all:       { label: "ทั้งหมด",           color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Users },
  view_only: { label: "ดูเท่านั้น",         color: "bg-slate-50 text-slate-600 border-slate-200",   icon: Eye },
}

export default function OrgChartEditDrawer({ employeeId, employeeName, onClose, onUpdate }: {
  employeeId: string
  employeeName: string
  onClose: () => void
  onUpdate?: () => void
}) {
  const [chain, setChain] = useState<ChainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [allEmps, setAllEmps] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [pickEvalId, setPickEvalId] = useState<string | null>(null)
  const [pickScope, setPickScope] = useState<"kpi"|"probation"|"all"|"view_only">("kpi")
  const [pickNote, setPickNote] = useState("")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  async function loadChain() {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees/evaluation-chain?employee_id=${employeeId}`)
      const data = await res.json()
      setChain(data)
    } catch {}
    setLoading(false)
  }

  // server-side debounced search — ครอบทุก field (TH/EN/nickname/code)
  //   ค้นข้ามบริษัทเสมอ (super_admin) — กัน "ไม่พบ" เพราะคนที่อยู่บริษัทอื่น
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  async function searchEmps(q: string) {
    try {
      const res = await fetch(`/api/employees/search?q=${encodeURIComponent(q)}&limit=50&all_companies=1`)
      const data = await res.json()
      setAllEmps(data.employees ?? [])
    } catch {}
  }

  useEffect(() => {
    loadChain()
  }, [employeeId])

  // เริ่มโหลดรายการเริ่มต้น (20 คน) เมื่อเปิด form เพิ่มผู้ประเมิน
  useEffect(() => {
    if (showAdd && allEmps.length === 0) searchEmps("")
  }, [showAdd])

  // debounce search 250ms — เรียก server ทุกครั้งที่ user พิมพ์
  useEffect(() => {
    if (!showAdd) return
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => { searchEmps(search) }, 250)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [search, showAdd])

  async function handleAdd() {
    if (!pickEvalId) { toast.error("เลือกผู้ประเมิน"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/employees/evaluators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId, evaluator_id: pickEvalId, scope: pickScope, note: pickNote || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "เพิ่มไม่สำเร็จ")
      toast.success("เพิ่มผู้ประเมินสำเร็จ")
      setShowAdd(false); setPickEvalId(null); setPickScope("kpi"); setPickNote(""); setSearch("")
      loadChain()
      onUpdate?.()
    } catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`ลบ ${name} ออกจากผู้ประเมิน?`)) return
    try {
      const res = await fetch(`/api/employees/evaluators?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "ลบไม่สำเร็จ")
      toast.success("ลบสำเร็จ")
      loadChain()
      onUpdate?.()
    } catch (e: any) { toast.error(e.message) }
  }

  // server-side ทำ search ให้แล้ว → client-side แค่ exclude self + คนที่เพิ่มไปแล้ว
  const filteredEmps = allEmps.filter(e => {
    if (e.id === employeeId) return false
    if (chain?.evaluators.additional.some((a: any) => a.id === e.id)) return false
    return true
  })
  const pickEmp = allEmps.find(e => e.id === pickEvalId)

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        onClick={e => e.stopPropagation()}
        className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col animate-slide-in"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-2 z-10">
          <Network size={18} className="text-indigo-600 shrink-0"/>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-slate-800 truncate">{employeeName}</h3>
            <p className="text-[11px] text-slate-400">สาย/ผู้ประเมิน</p>
          </div>
          <Link href={`/admin/employees/${employeeId}`} target="_blank"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center" title="เปิดหน้าพนักงาน">
            <ExternalLink size={14} className="text-slate-400"/>
          </Link>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X size={14}/>
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300"/></div>
          ) : !chain ? (
            <p className="text-center text-slate-400 py-8">ไม่พบข้อมูล</p>
          ) : (
            <>
              {/* ── ใครประเมินคนนี้ได้บ้าง ── */}
              <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <ArrowUp size={12} className="text-indigo-600"/>
                    ใครประเมินคนนี้ได้
                  </h4>
                </div>

                {chain.evaluators.direct_manager && (
                  <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-emerald-700 font-bold text-sm">{chain.evaluators.direct_manager.first_name_th[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{chain.evaluators.direct_manager.first_name_th} {chain.evaluators.direct_manager.last_name_th}</p>
                      <p className="text-[10px] text-slate-400 truncate">{chain.evaluators.direct_manager.position?.name ?? "—"}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">หัวหน้าตรง · L1</span>
                  </div>
                )}

                {chain.evaluators.skip_level && (
                  <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-indigo-700 font-bold text-sm">{chain.evaluators.skip_level.first_name_th[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{chain.evaluators.skip_level.first_name_th} {chain.evaluators.skip_level.last_name_th}</p>
                      <p className="text-[10px] text-slate-400 truncate">{chain.evaluators.skip_level.position?.name ?? "—"}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">ระดับสูง · L2</span>
                  </div>
                )}

                {chain.evaluators.additional.map((a: any) => {
                  const meta = SCOPE_META[a.scope] ?? SCOPE_META.all
                  const Icon = meta.icon
                  return (
                    <div key={a.id} className="bg-white rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100 group">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <span className="text-violet-700 font-bold text-sm">{a.first_name_th[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{a.first_name_th} {a.last_name_th}</p>
                        <p className="text-[10px] text-slate-400 truncate">{a.position?.name ?? "—"}</p>
                      </div>
                      <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded flex items-center gap-1 ${meta.color}`}>
                        <Icon size={9}/>{meta.label}
                      </span>
                      <button onClick={() => handleRemove(a.id, `${a.first_name_th} ${a.last_name_th}`)}
                        className="w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 flex items-center justify-center transition-opacity">
                        <Trash2 size={11} className="text-red-400"/>
                      </button>
                    </div>
                  )
                })}

                {!chain.evaluators.direct_manager && !chain.evaluators.skip_level && chain.evaluators.additional.length === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <AlertCircle size={16} className="mx-auto text-amber-500 mb-1"/>
                    <p className="text-xs text-amber-700 font-bold">ยังไม่มีหัวหน้า</p>
                  </div>
                )}

                {/* + เพิ่ม */}
                {!showAdd ? (
                  <button onClick={() => { setShowAdd(true) }}
                    className="w-full bg-white border-2 border-dashed border-indigo-200 rounded-xl py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-1">
                    <UserPlus size={12}/> เพิ่มผู้ประเมินเพิ่มเติม
                  </button>
                ) : (
                  <div className="bg-white border border-indigo-200 rounded-xl p-3 space-y-2">
                    {!pickEmp ? (
                      <>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                          placeholder="ค้นหาชื่อ / รหัส..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-400" />
                        <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
                          {filteredEmps.slice(0, 50).map(e => (
                            <button key={e.id} onClick={() => setPickEvalId(e.id)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50">
                              <span className="font-bold">{e.first_name_th} {e.last_name_th}</span>
                              {e.nickname && <span className="text-slate-400 ml-1">({e.nickname})</span>}
                              <span className="text-slate-400 ml-2">{e.employee_code}</span>
                            </button>
                          ))}
                          {filteredEmps.length === 0 && (
                            <p className="text-center py-3 text-xs text-slate-400">
                              {search.trim() ? "ไม่พบรายชื่อตรงกับคำค้น" : "พิมพ์เพื่อค้นหา..."}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 bg-indigo-50 rounded-lg px-2 py-1.5">
                          <span className="text-xs font-bold">{pickEmp.first_name_th} {pickEmp.last_name_th}</span>
                          <button onClick={() => setPickEvalId(null)} className="ml-auto text-[10px] text-indigo-600 hover:underline">เปลี่ยน</button>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600">สิทธิ์</p>
                        <div className="grid grid-cols-2 gap-1">
                          {(["kpi","probation","all","view_only"] as const).map(s => {
                            const meta = SCOPE_META[s]; const Icon = meta.icon
                            const active = pickScope === s
                            return (
                              <button key={s} onClick={() => setPickScope(s)}
                                className={`text-[10px] font-bold border rounded-lg px-2 py-1 flex items-center gap-1 ${active ? meta.color + " ring-2 ring-indigo-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                                <Icon size={10}/>{meta.label}
                              </button>
                            )
                          })}
                        </div>
                        <input value={pickNote} onChange={e => setPickNote(e.target.value)}
                          placeholder="หมายเหตุ (ไม่บังคับ)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] outline-none" />
                        <button onClick={handleAdd} disabled={saving}
                          className="w-full bg-indigo-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1">
                          {saving ? <Loader2 size={11} className="animate-spin"/> : <Plus size={11}/>} บันทึก
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ── คนนี้เป็นหัวหน้าใคร ── */}
              <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <ArrowDown size={12} className="text-emerald-600"/>
                    เป็นหัวหน้าใครบ้าง
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{chain.stats.total}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-white rounded-lg py-1.5 border border-slate-100">
                    <p className="text-base font-black text-emerald-700">{chain.stats.direct_count}</p>
                    <p className="text-[8px] text-slate-500 font-bold">ตรง (L1)</p>
                  </div>
                  <div className="bg-white rounded-lg py-1.5 border border-slate-100">
                    <p className="text-base font-black text-indigo-700">{chain.stats.skip_count}</p>
                    <p className="text-[8px] text-slate-500 font-bold">ในสาย (L2)</p>
                  </div>
                  <div className="bg-white rounded-lg py-1.5 border border-slate-100">
                    <p className="text-base font-black text-violet-700">{chain.stats.additional_count}</p>
                    <p className="text-[8px] text-slate-500 font-bold">เพิ่มเติม</p>
                  </div>
                </div>
                {chain.stats.direct_count > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-emerald-700">ลูกน้องตรง</p>
                    {chain.subordinates.direct.slice(0, 5).map((p: any) => (
                      <div key={p.id} className="bg-white rounded-lg px-2 py-1 text-xs flex items-center gap-2 border border-slate-100">
                        <span className="font-bold text-slate-700 truncate">{p.first_name_th} {p.last_name_th}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{p.position?.name ?? "—"}</span>
                      </div>
                    ))}
                    {chain.subordinates.direct.length > 5 && (
                      <p className="text-[10px] text-slate-400 text-center">และอีก {chain.subordinates.direct.length - 5} คน...</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.2s ease-out; }
      `}</style>
    </div>
  )
}
