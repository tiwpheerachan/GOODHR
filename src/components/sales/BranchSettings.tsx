"use client"
import { useEffect, useState } from "react"
import { MapPin, Edit2, X, Check, Loader2, Search, Store } from "lucide-react"
import toast from "react-hot-toast"

// ════════════════════════════════════════════════════════════════════
// BranchSettings — widget เล็กๆ ที่ /app/sales
//   - แสดงสาขาที่ตั้งไว้ + ปุ่มแก้
//   - คลิกแก้ → modal เลือกจากรายการที่ขายมาแล้ว + custom
// ════════════════════════════════════════════════════════════════════
export default function BranchSettings({ onChange }: { onChange?: (branch: string | null, channel: string | null) => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/products/sales/my-settings")
      const d = await res.json()
      if (res.ok) setData(d)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async (branch: string | null, channel: string | null) => {
    const res = await fetch("/api/products/sales/my-settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_branch_name: branch, default_sales_channel: channel }),
    })
    if (res.ok) {
      toast.success("บันทึกสาขาแล้ว")
      setEditing(false)
      onChange?.(branch, channel)
      load()
    } else {
      const d = await res.json()
      toast.error(d.error || "ไม่สำเร็จ")
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 px-4 py-2.5 flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-slate-400"/>
        <span className="text-xs text-slate-400">โหลด...</span>
      </div>
    )
  }

  const current = data?.default_branch_name || data?.employee_branch
  const isCustom = !!data?.default_branch_name && data?.default_branch_name !== data?.employee_branch

  return (
    <>
      <button onClick={() => setEditing(true)}
        className="w-full bg-white hover:bg-slate-50 rounded-xl border border-slate-100 px-4 py-2.5 flex items-center gap-3 group transition-colors shadow-sm">
        <div className={"w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 " +
          (current ? "bg-gradient-to-br from-emerald-400 to-teal-500" : "bg-slate-200")}>
          <MapPin size={16} className={current ? "text-white" : "text-slate-400"}/>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] uppercase font-black text-slate-400 leading-none">สาขาที่ขาย</p>
          <p className="text-sm font-black text-slate-800 truncate mt-0.5">
            {current || "ยังไม่ได้เลือกสาขา"}
            {isCustom && <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">custom</span>}
          </p>
          {data?.default_sales_channel && (
            <p className="text-[10px] text-indigo-600 font-bold mt-0.5">📍 {data.default_sales_channel}</p>
          )}
        </div>
        <Edit2 size={13} className="text-slate-400 group-hover:text-indigo-500 flex-shrink-0"/>
      </button>

      {editing && (
        <BranchPickerModal data={data} onClose={() => setEditing(false)} onSave={save}/>
      )}
    </>
  )
}

function BranchPickerModal({ data, onClose, onSave }: any) {
  const [branch, setBranch] = useState<string>(data?.default_branch_name || data?.employee_branch || "")
  const [channel, setChannel] = useState<string>(data?.default_sales_channel || "")
  const [q, setQ] = useState("")
  const [custom, setCustom] = useState(false)
  const [saving, setSaving] = useState(false)

  const branches: string[] = data?.available_branches || []
  const [channels, setChannels] = useState<string[]>([])
  useEffect(() => {
    fetch("/api/products/sales/channels").then(r => r.json())
      .then(d => setChannels((d.channels ?? []).map((c: any) => c.name)))
      .catch(() => setChannels(["Brand Shop", "CDS", "Dealer"]))
  }, [])
  const filteredBranches = branches.filter(b => !q || b.toLowerCase().includes(q.toLowerCase()))

  const submit = async () => {
    setSaving(true)
    try { await onSave(branch.trim() || null, channel.trim() || null) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between">
          <p className="font-black flex items-center gap-2"><Store size={16}/> ตั้งค่าสาขาที่ขาย</p>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Channel chips */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1.5">ช่องทางขาย</p>
            <div className="flex flex-wrap gap-1.5">
              {channels.map(c => (
                <button key={c} onClick={() => setChannel(c === channel ? "" : c)}
                  className={"px-3 py-1.5 rounded-xl text-[11px] font-black transition " +
                    (channel === c ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                  {c}
                </button>
              ))}
              <input value={channel && !channels.includes(channel) ? channel : ""}
                onChange={e => setChannel(e.target.value)}
                placeholder="หรือพิมพ์เอง..."
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] outline-none focus:border-indigo-400 w-32"/>
            </div>
          </div>

          {/* Branch search */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-black text-slate-500 uppercase">สาขา</p>
              <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                <input type="checkbox" checked={custom} onChange={e => setCustom(e.target.checked)} className="rounded"/>
                พิมพ์เอง
              </label>
            </div>
            {custom ? (
              <input value={branch} onChange={e => setBranch(e.target.value)} autoFocus
                placeholder="เช่น Dreame Central Pinklao"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-400"/>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                  <Search size={13} className="text-slate-400"/>
                  <input value={q} onChange={e => setQ(e.target.value)} autoFocus
                    placeholder="ค้นสาขา..." className="flex-1 bg-transparent outline-none text-sm"/>
                </div>
                <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                  {filteredBranches.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400">ไม่พบสาขา — เปิด "พิมพ์เอง"</p>
                  ) : filteredBranches.map(b => (
                    <button key={b} onClick={() => setBranch(b)}
                      className={"w-full text-left px-3 py-2 hover:bg-emerald-50/50 flex items-center gap-2 " + (branch === b ? "bg-emerald-50" : "")}>
                      <MapPin size={12} className={branch === b ? "text-emerald-600" : "text-slate-400"}/>
                      <span className={"text-xs " + (branch === b ? "font-black text-emerald-700" : "font-bold text-slate-700")}>{b}</span>
                      {branch === b && <Check size={12} className="ml-auto text-emerald-600"/>}
                    </button>
                  ))}
                </div>
              </>
            )}
            {branch && <p className="mt-2 text-[10px] text-emerald-600 font-bold">✓ เลือก: {branch}</p>}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl">ยกเลิก</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white text-sm font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}
