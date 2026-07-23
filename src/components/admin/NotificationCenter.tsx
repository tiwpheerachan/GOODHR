"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Bell, Send, ListChecks, ScrollText, ShieldCheck, Search, Plus, Trash2,
  Loader2, Check, X, Users, RefreshCw, CheckCircle2, AlertCircle, UserCog, Building2, UserCheck, Rocket,
} from "lucide-react"
import toast from "react-hot-toast"

const COLORS: { key: string; label: string; hex: string }[] = [
  { key: "blue", label: "ฟ้า", hex: "#3370ff" }, { key: "green", label: "เขียว", hex: "#2ba471" },
  { key: "orange", label: "ส้ม", hex: "#e8833a" }, { key: "red", label: "แดง", hex: "#e34d59" },
  { key: "purple", label: "ม่วง", hex: "#7f5bd6" }, { key: "grey", label: "เทา", hex: "#646a73" },
]
const hexOf = (c?: string) => COLORS.find((x) => x.key === c)?.hex ?? "#3370ff"

// ผู้รับ 3 กลุ่ม
const AUD: Record<string, { label: string; chip: string }> = {
  employee: { label: "👤 พนักงาน (ลูกน้อง)", chip: "bg-emerald-50 text-emerald-700" },
  manager: { label: "🔒 หัวหน้า", chip: "bg-blue-50 text-blue-700" },
  hr: { label: "🏢 HR / Admin", chip: "bg-purple-50 text-purple-700" },
}
const AUD_ORDER = ["employee", "manager", "hr"]

type Row = { label: string; value: string }
type Tmpl = { key: string; name: string; category: string; audience: string; enabled: boolean; header_color: string; title_tmpl: string | null; body_tmpl: string | null; sample_rows: Row[]; sort_order: number }
type Emp = { id: string; employee_code?: string | null; first_name_th?: string | null; last_name_th?: string | null; nickname?: string | null; department?: any }
const empName = (e: any) => e?.name || `${e?.first_name_th || ""} ${e?.last_name_th || ""}${e?.nickname ? ` (${e.nickname})` : ""}`.trim() || e?.employee_code || "-"

export default function NotificationCenter() {
  const [sub, setSub] = useState<"send" | "rollout" | "templates" | "log" | "senders">("send")
  const SUBS = [
    { k: "send", l: "ส่งเอง", icon: Send }, { k: "rollout", l: "สิทธิ์รับ (เริ่มใช้กับใคร)", icon: UserCheck },
    { k: "templates", l: "การ์ด/ชนิด", icon: ListChecks },
    { k: "log", l: "ประวัติการส่ง", icon: ScrollText }, { k: "senders", l: "สิทธิ์ผู้ส่ง", icon: ShieldCheck },
  ] as const
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-sm"><Bell size={20} className="text-white" /></div>
        <div><h1 className="text-xl font-black text-slate-800">ศูนย์แจ้งเตือน</h1>
          <p className="text-[11px] text-slate-500">ส่งการ์ดเข้า Feishu · แยกของหัวหน้า/ลูกน้อง/HR · ประวัติการส่ง · สิทธิ์ผู้ส่ง</p></div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {SUBS.map((s) => (
          <button key={s.k} onClick={() => setSub(s.k as any)}
            className={`px-3.5 py-2 text-xs font-black rounded-xl flex items-center gap-1.5 border transition ${sub === s.k ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
            <s.icon size={13} /> {s.l}</button>
        ))}
      </div>
      {sub === "send" && <SendPanel />}
      {sub === "rollout" && <RolloutPanel />}
      {sub === "templates" && <TemplatesPanel />}
      {sub === "log" && <LogPanel />}
      {sub === "senders" && <SendersPanel />}
    </div>
  )
}

// ═══════════════ พรีวิวการ์ด (รองรับ rows ละเอียด) ═══════════════
function CardPreview({ color, title, body, rows }: { color: string; title: string; body: string; rows?: Row[] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white max-w-sm">
      <div className="flex items-center gap-1.5 px-3 pt-2">
        <span className="w-4 h-4 rounded bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-[9px]">👥</span>
        <span className="text-[10px] font-bold text-slate-500">GOODHR</span>
        <span className="text-[8px] font-black text-slate-400 border border-slate-200 px-1 rounded">BOT</span>
      </div>
      <div className="text-white font-bold text-sm px-3.5 py-2 mt-1.5" style={{ background: hexOf(color) }}>{title || "(หัวข้อ)"}</div>
      <div className="px-3.5 py-2.5 space-y-2">
        {body && <div className="text-[13px] text-slate-700 whitespace-pre-wrap">{body}</div>}
        {rows && rows.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 border-t border-slate-100">
            {rows.map((r, i) => <div key={i} className="text-[12px]"><span className="text-slate-400">{r.label}</span><br /><span className="font-semibold text-slate-700">{r.value}</span></div>)}
          </div>
        )}
        {!body && (!rows || rows.length === 0) && <div className="text-[13px] text-slate-300">(เนื้อหา)</div>}
      </div>
      <div className="px-3.5 pb-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400">GOODHR Bot · พรีวิว</div>
    </div>
  )
}

// ═══════════════ ค้นหา + เลือกพนักงาน ═══════════════
function EmpPicker({ selected, onToggle }: { selected: Map<string, Emp>; onToggle: (e: Emp) => void }) {
  const [q, setQ] = useState(""); const [results, setResults] = useState<Emp[]>([]); const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try { const r = await fetch(`/api/employees/search?q=${encodeURIComponent(q)}&limit=30&all_companies=1`); const j = await r.json(); setResults(j.employees ?? []) } finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [q])
  return (
    <div>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ / รหัส / ชื่อเล่น..." className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        {loading && <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-indigo-400" />}
      </div>
      {results.length > 0 && (
        <div className="mt-1.5 max-h-52 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
          {results.map((e) => { const on = selected.has(e.id); return (
            <button key={e.id} onClick={() => onToggle(e)} className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${on ? "bg-indigo-50" : ""}`}>
              <span className={`w-4 h-4 rounded border grid place-items-center ${on ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>{on && <Check size={11} className="text-white" />}</span>
              <span className="flex-1">{empName(e)}</span><span className="text-[10px] text-slate-400 tabular-nums">{e.employee_code}</span>
            </button>
          )})}
        </div>
      )}
    </div>
  )
}

// ═══════════════ ส่งเอง ═══════════════
function SendPanel() {
  const [tmpls, setTmpls] = useState<Tmpl[]>([])
  const [tKey, setTKey] = useState("custom")
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [color, setColor] = useState("blue")
  const [rows, setRows] = useState<Row[]>([]); const [audience, setAudience] = useState("employee")
  const [selected, setSelected] = useState<Map<string, Emp>>(new Map())
  const [sending, setSending] = useState(false)
  const [deps, setDeps] = useState<{ id: string; name: string }[]>([])
  const [depId, setDepId] = useState(""); const [grpLoading, setGrpLoading] = useState("")

  useEffect(() => {
    fetch("/api/admin/notifications/templates").then((r) => r.json()).then((j) => setTmpls(j.templates ?? []))
    fetch("/api/admin/notifications/recipients?list=departments").then((r) => r.json()).then((j) => setDeps(j.departments ?? []))
  }, [])
  const applyTmpl = (k: string) => {
    setTKey(k); const t = tmpls.find((x) => x.key === k)
    if (t) { setTitle(t.title_tmpl || ""); setBody(t.body_tmpl || ""); setColor(t.header_color || "blue"); setRows(t.sample_rows || []); setAudience(t.audience || "employee") }
  }
  const toggle = (e: Emp) => setSelected((m) => { const n = new Map(m); n.has(e.id) ? n.delete(e.id) : n.set(e.id, e); return n })
  const addGroup = async (url: string, tag: string) => {
    setGrpLoading(tag)
    try {
      const r = await fetch(url); const j = await r.json()
      const list: Emp[] = j.employees ?? []
      setSelected((m) => { const n = new Map(m); for (const e of list) n.set(e.id, e); return n })
      toast.success(`เพิ่ม ${list.length} คน`)
    } finally { setGrpLoading("") }
  }

  const send = async () => {
    if (!title.trim()) return toast.error("กรุณาใส่หัวข้อ")
    if (selected.size === 0) return toast.error("เลือกผู้รับอย่างน้อย 1 คน")
    setSending(true)
    try {
      const r = await fetch("/api/admin/notifications/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tKey, audience, title, body, header_color: color, rows: tKey === "custom" ? [] : rows, employee_ids: Array.from(selected.keys()) }),
      })
      const j = await r.json()
      if (!r.ok) return toast.error(j.error || "ส่งไม่สำเร็จ")
      toast.success(`ส่งสำเร็จ ${j.sent} คน${j.failed ? ` · ไม่สำเร็จ ${j.failed}` : ""}${j.blocked ? ` · ยังไม่เปิดสิทธิ์ ${j.blocked}` : ""}`)
      if (j.blocked) toast(`⛔ ${j.blocked} คนยังไม่เปิดสิทธิ์รับ (นำร่อง) — เปิดที่แท็บ "สิทธิ์รับ"`, { duration: 6000 })
      else if (j.failed) { const fails = (j.results || []).filter((x: any) => x.status === "failed").slice(0, 5); if (fails.length) toast(`ไม่สำเร็จ: ${fails.map((f: any) => `${f.name || "-"} (${f.error})`).join(", ")}`, { duration: 6000 }) }
    } catch (e: any) { toast.error(e.message) } finally { setSending(false) }
  }

  // จัดกลุ่ม template ตาม audience ไว้ทำ optgroup
  const byAud = AUD_ORDER.map((a) => ({ a, items: tmpls.filter((t) => t.audience === a) })).filter((g) => g.items.length)

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div>
          <label className="text-[11px] font-black text-slate-500">เลือกแม่แบบ (แยกตามผู้รับ)</label>
          <select value={tKey} onChange={(e) => applyTmpl(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white">
            {byAud.map((g) => <optgroup key={g.a} label={AUD[g.a]?.label || g.a}>{g.items.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</optgroup>)}
          </select>
          <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${AUD[audience]?.chip}`}>ส่งถึง: {AUD[audience]?.label}</span>
        </div>
        <div><label className="text-[11px] font-black text-slate-500">หัวข้อ</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl" placeholder="เช่น ประกาศจาก HR" /></div>
        <div><label className="text-[11px] font-black text-slate-500">เนื้อหา</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none" placeholder="ข้อความ (รองรับ **ตัวหนา**)" /></div>
        {tKey !== "custom" && rows.length > 0 && (
          <div><label className="text-[11px] font-black text-slate-500">รายละเอียดในการ์ด (แก้ได้)</label>
            <div className="mt-1 space-y-1">
              {rows.map((r, i) => (
                <div key={i} className="flex gap-1.5">
                  <input value={r.label} onChange={(e) => setRows((a) => a.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className="w-2/5 px-2 py-1 text-xs border border-slate-200 rounded-lg" />
                  <input value={r.value} onChange={(e) => setRows((a) => a.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-lg" />
                  <button onClick={() => setRows((a) => a.filter((_, j) => j !== i))} className="text-rose-400 px-1"><X size={13} /></button>
                </div>
              ))}
              <button onClick={() => setRows((a) => [...a, { label: "", value: "" }])} className="text-[11px] text-indigo-600 font-bold flex items-center gap-1"><Plus size={12} /> เพิ่มบรรทัด</button>
            </div>
          </div>
        )}
        <div><label className="text-[11px] font-black text-slate-500">สีหัวการ์ด</label>
          <div className="mt-1 flex gap-1.5 flex-wrap">{COLORS.map((c) => <button key={c.key} onClick={() => setColor(c.key)} title={c.label} className={`w-7 h-7 rounded-lg border-2 ${color === c.key ? "border-slate-800" : "border-transparent"}`} style={{ background: c.hex }} />)}</div></div>

        {/* ผู้รับ + เลือกกลุ่ม */}
        <div>
          <label className="text-[11px] font-black text-slate-500">ผู้รับ ({selected.size})</label>
          <div className="mt-1 flex gap-1.5 flex-wrap items-center">
            <button onClick={() => addGroup("/api/admin/notifications/recipients?group=managers", "mgr")} disabled={grpLoading === "mgr"} className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full flex items-center gap-1 disabled:opacity-50"><UserCog size={12} /> หัวหน้าทั้งหมด</button>
            <button onClick={() => addGroup("/api/admin/notifications/recipients?group=all", "all")} disabled={grpLoading === "all"} className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full flex items-center gap-1 disabled:opacity-50"><Users size={12} /> ทุกคน</button>
            <select value={depId} onChange={(e) => { setDepId(e.target.value); if (e.target.value) addGroup(`/api/admin/notifications/recipients?group=department&department_id=${e.target.value}`, "dep") }} className="text-[11px] border border-slate-200 rounded-full px-2 py-1 bg-white">
              <option value="">＋ ทั้งแผนก...</option>{deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {selected.size > 0 && <button onClick={() => setSelected(new Map())} className="text-[11px] text-rose-500 font-bold">ล้าง</button>}
          </div>
          {selected.size > 0 && (
            <div className="mt-1.5 flex gap-1 flex-wrap max-h-24 overflow-y-auto">
              {Array.from(selected.values()).map((e) => <span key={e.id} className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{empName(e)}<button onClick={() => toggle(e)}><X size={11} /></button></span>)}
            </div>
          )}
          <div className="mt-1.5"><EmpPicker selected={selected} onToggle={toggle} /></div>
        </div>
        <button onClick={send} disabled={sending} className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2">
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} ส่งแจ้งเตือน ({selected.size} คน)
        </button>
      </div>
      <div className="space-y-2">
        <div className="text-[11px] font-black text-slate-500">พรีวิว (หน้าตาใน Feishu)</div>
        <CardPreview color={color} title={title} body={body} rows={tKey === "custom" ? [] : rows} />
        <p className="text-[11px] text-slate-400">ระบบเลือก open_id จริงจาก Feishu Mapping ให้อัตโนมัติ · ผู้รับที่ยังไม่ผูก Feishu จะขึ้น "ไม่สำเร็จ" ในประวัติ</p>
      </div>
    </div>
  )
}

// ═══════════════ การ์ด/ชนิด — แยกตามผู้รับ ═══════════════
function TemplatesPanel() {
  const [tmpls, setTmpls] = useState<Tmpl[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState<string | null>(null)
  const load = useCallback(() => { setLoading(true); fetch("/api/admin/notifications/templates").then((r) => r.json()).then((j) => { setTmpls(j.templates ?? []); setLoading(false) }) }, [])
  useEffect(() => { load() }, [load])
  const save = async (t: Tmpl) => { setSaving(t.key); try { const r = await fetch("/api/admin/notifications/templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) }); if (!r.ok) { const j = await r.json(); return toast.error(j.error || "บันทึกไม่สำเร็จ") } toast.success("บันทึกแล้ว") } finally { setSaving(null) } }
  const patch = (k: string, f: Partial<Tmpl>) => setTmpls((a) => a.map((t) => t.key === k ? { ...t, ...f } : t))
  if (loading) return <div className="py-10 text-center text-slate-400"><Loader2 className="animate-spin inline" /> กำลังโหลด...</div>

  const groups = AUD_ORDER.map((a) => ({ a, items: tmpls.filter((t) => t.audience === a) })).filter((g) => g.items.length)
  return (
    <div className="space-y-5">
      <p className="text-[11px] text-slate-400">เปิด-ปิด + custom ข้อความ/รายละเอียดของแต่ละการ์ด · แยกตามผู้รับ</p>
      {groups.map((g) => (
        <div key={g.a} className="space-y-3">
          <div className="flex items-center gap-2"><span className={`text-xs font-black px-2.5 py-1 rounded-full ${AUD[g.a]?.chip}`}>{AUD[g.a]?.label}</span><span className="text-[11px] text-slate-400">{g.items.length} การ์ด</span></div>
          {g.items.map((t) => (
            <div key={t.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => { patch(t.key, { enabled: !t.enabled }); save({ ...t, enabled: !t.enabled }) }} className={`w-10 h-6 rounded-full relative transition ${t.enabled ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${t.enabled ? "left-[18px]" : "left-0.5"}`} /></button>
                  <span className="font-black text-sm text-slate-800">{t.name}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${t.category === "manual" ? "bg-purple-50 text-purple-600" : "bg-slate-100 text-slate-500"}`}>{t.category}</span>
                </div>
                <input value={t.title_tmpl ?? ""} onChange={(e) => patch(t.key, { title_tmpl: e.target.value })} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg" placeholder="หัวข้อ" />
                <textarea value={t.body_tmpl ?? ""} onChange={(e) => patch(t.key, { body_tmpl: e.target.value })} rows={2} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg resize-none" placeholder="เนื้อหา" />
                {(t.sample_rows?.length ?? 0) > 0 && <p className="text-[10px] text-slate-400">รายละเอียด {t.sample_rows.length} บรรทัด (ค่าจริงมาจากข้อมูลตอนส่ง)</p>}
                <div className="flex items-center gap-1.5">
                  {COLORS.map((c) => <button key={c.key} onClick={() => patch(t.key, { header_color: c.key })} className={`w-5 h-5 rounded border-2 ${t.header_color === c.key ? "border-slate-800" : "border-transparent"}`} style={{ background: c.hex }} />)}
                  <button onClick={() => save(t)} disabled={saving === t.key} className="ml-auto px-3 py-1.5 bg-slate-800 text-white text-xs font-black rounded-lg flex items-center gap-1 disabled:opacity-50">{saving === t.key ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} บันทึก</button>
                </div>
              </div>
              <div className="flex items-start justify-center"><CardPreview color={t.header_color} title={t.title_tmpl || ""} body={t.body_tmpl || ""} rows={t.sample_rows} /></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ═══════════════ ประวัติการส่ง (ฟิลเตอร์ฉลาด) ═══════════════
function LogPanel() {
  const [logs, setLogs] = useState<any[]>([]); const [total, setTotal] = useState(0); const [sent, setSent] = useState(0); const [failed, setFailed] = useState(0)
  const [page, setPage] = useState(0)
  const [fType, setFType] = useState(""); const [fStatus, setFStatus] = useState(""); const [fSender, setFSender] = useState("")
  const [q, setQ] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("")
  const [loading, setLoading] = useState(true)
  const SIZE = 30
  const buildParams = (extra?: Record<string, string>) => {
    const p = new URLSearchParams({ limit: String(SIZE), offset: String(page * SIZE), ...(extra || {}) })
    if (fType) p.set("type", fType); if (fStatus) p.set("status", fStatus); if (fSender) p.set("sender", fSender)
    if (q.trim()) p.set("q", q.trim()); if (from) p.set("from", from); if (to) p.set("to", to)
    return p
  }
  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/notifications/log?${buildParams()}`).then((r) => r.json()).then((j) => {
      setLogs(j.logs ?? []); setTotal(j.total ?? 0); setSent(j.sent ?? 0); setFailed(j.failed ?? 0); setLoading(false)
    })
  }, [page, fType, fStatus, fSender, q, from, to])
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t) }, [load])

  const exportCsv = async () => {
    const p = buildParams({ export: "1" }); p.delete("limit"); p.delete("offset")
    const j = await (await fetch(`/api/admin/notifications/log?${p}`)).json()
    const rows = j.logs ?? []
    const head = ["เวลา", "ชนิด", "ผู้รับ", "Feishu ID", "หัวข้อ", "ผู้ส่ง", "สถานะ", "error", "message_id"]
    const csv = [head.join(","), ...rows.map((l: any) => [
      new Date(l.created_at).toLocaleString("th-TH"), l.type, l.recipient_name, l.recipient_feishu_id, l.title, l.sent_by_name, l.status, l.error, l.message_id,
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `notification-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }
  const reset = () => { setFType(""); setFStatus(""); setFSender(""); setQ(""); setFrom(""); setTo(""); setPage(0) }

  return (
    <div className="space-y-3">
      {/* สรุป */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-slate-100 p-3 text-center"><div className="text-2xl font-black text-slate-700 tabular-nums">{total}</div><div className="text-[11px] text-slate-500 font-bold">ทั้งหมด (ตามฟิลเตอร์)</div></div>
        <div className="bg-white rounded-xl border border-slate-100 p-3 text-center"><div className="text-2xl font-black text-emerald-600 tabular-nums">{sent}</div><div className="text-[11px] text-slate-500 font-bold">สำเร็จ</div></div>
        <div className="bg-white rounded-xl border border-slate-100 p-3 text-center"><div className="text-2xl font-black text-rose-600 tabular-nums">{failed}</div><div className="text-[11px] text-slate-500 font-bold">ไม่สำเร็จ</div></div>
      </div>
      {/* ฟิลเตอร์ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="ค้นชื่อผู้รับ / หัวข้อ / Feishu ID..." className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={fType} onChange={(e) => { setFType(e.target.value); setPage(0) }} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
            <option value="">ทุกชนิด</option>{["checkin", "checkout", "relay", "custom", "intro", "checkin_due", "checkout_reminder", "manager_digest", "celebrations", "probation_due", "stale_approvals"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fStatus} onChange={(e) => { setFStatus(e.target.value); setPage(0) }} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"><option value="">ทุกสถานะ</option><option value="sent">สำเร็จ</option><option value="failed">ไม่สำเร็จ</option></select>
          <select value={fSender} onChange={(e) => { setFSender(e.target.value); setPage(0) }} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"><option value="">ทุกผู้ส่ง</option><option value="auto">อัตโนมัติ</option><option value="manual">ส่งเอง</option></select>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0) }} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg" title="จากวันที่" />
          <span className="text-slate-400 text-xs">–</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0) }} className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg" title="ถึงวันที่" />
          <button onClick={reset} className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-500 font-bold">ล้าง</button>
          <button onClick={load} className="p-1.5 bg-white border border-slate-200 rounded-lg"><RefreshCw size={13} className={loading ? "animate-spin text-indigo-500" : "text-slate-500"} /></button>
          <button onClick={exportCsv} className="ml-auto px-3 py-1.5 bg-emerald-600 text-white text-xs font-black rounded-lg flex items-center gap-1"><ScrollText size={13} /> Export CSV</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500"><tr>
            <th className="text-left px-3 py-2 font-black">เวลา</th><th className="text-left px-3 py-2 font-black">ชนิด</th><th className="text-left px-3 py-2 font-black">ผู้รับ</th>
            <th className="text-left px-3 py-2 font-black">หัวข้อ</th><th className="text-left px-3 py-2 font-black">ผู้ส่ง</th><th className="text-left px-3 py-2 font-black">สถานะ</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-50">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-500 tabular-nums whitespace-nowrap">{new Date(l.created_at).toLocaleString("th-TH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-3 py-2"><span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{l.type}</span></td>
                <td className="px-3 py-2 text-slate-700">{l.recipient_name || "-"}</td>
                <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate">{l.title}</td>
                <td className="px-3 py-2 text-slate-500">{l.sent_by_name || "-"}</td>
                <td className="px-3 py-2">{l.status === "sent" ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 size={12} /> สำเร็จ</span> : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600" title={l.error}><AlertCircle size={12} /> ไม่สำเร็จ</span>}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">ยังไม่มีประวัติการส่ง</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40">ก่อนหน้า</button>
        <span className="text-[11px] text-slate-500">{page + 1} / {Math.max(1, Math.ceil(total / SIZE))}</span>
        <button disabled={(page + 1) * SIZE >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40">ถัดไป</button>
      </div>
    </div>
  )
}

// ═══════════════ สิทธิ์รับแจ้งเตือน (rollout — เริ่มใช้กับใคร) ═══════════════
function RolloutPanel() {
  const [mode, setMode] = useState<"all" | "pilot" | "none">("none")
  const [emps, setEmps] = useState<any[]>([])
  const [deps, setDeps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [pick, setPick] = useState<Map<string, Emp>>(new Map())
  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/notifications/rollout").then((r) => r.json()).then((j) => { setMode(j.mode ?? "none"); setEmps(j.employees ?? []); setDeps(j.departments ?? []); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])

  const setAll = async (on: boolean) => {
    await fetch("/api/admin/notifications/rollout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: on ? "all" : "pilot" }) })
    toast.success(on ? "เปิดรับทุกคนแล้ว" : "กลับเป็นโหมดนำร่อง"); load()
  }
  const toggleDep = async (d: any) => {
    if (d.enabled) await fetch(`/api/admin/notifications/rollout?id=${d.row_id}`, { method: "DELETE" })
    else await fetch("/api/admin/notifications/rollout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department_ids: [d.department_id] }) })
    load()
  }
  const addEmps = async () => {
    if (pick.size === 0) return
    await fetch("/api/admin/notifications/rollout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employee_ids: Array.from(pick.keys()) }) })
    toast.success("เปิดสิทธิ์รับแล้ว"); setPick(new Map()); setAdding(false); load()
  }
  const rmEmp = async (rowId: string) => { await fetch(`/api/admin/notifications/rollout?id=${rowId}`, { method: "DELETE" }); load() }
  const toggle = (e: Emp) => setPick((m) => { const n = new Map(m); n.has(e.id) ? n.delete(e.id) : n.set(e.id, e); return n })

  if (loading) return <div className="py-16 text-center text-slate-400"><Loader2 className="animate-spin inline" size={22} /> กำลังโหลด...</div>
  const enabledDeps = deps.filter((d) => d.enabled).length

  return (
    <div className="space-y-5">
      {/* โหมด — banner ใหญ่ */}
      <div className={`rounded-3xl border-2 p-6 flex items-center gap-5 ${mode === "all" ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200" : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"}`}>
        <div className={`w-16 h-16 rounded-2xl grid place-items-center shadow-sm ${mode === "all" ? "bg-emerald-500" : "bg-amber-500"}`}><Rocket size={30} className="text-white" /></div>
        <div className="flex-1">
          <div className="font-black text-lg text-slate-800">{mode === "all" ? "🎉 เปิดรับทุกคนแล้ว — ใช้งานเต็มระบบ" : "🚀 โหมดนำร่อง"}</div>
          <div className="text-sm text-slate-500 mt-0.5">{mode === "all" ? "ทุกคนที่ผูก Feishu จะได้รับแจ้งเตือน" : "ส่งเฉพาะคน/แผนกที่เปิดสิทธิ์ด้านล่าง · ที่เหลือจะถูกข้าม"}</div>
        </div>
        <button onClick={() => setAll(mode !== "all")} className={`px-6 py-3 text-sm font-black rounded-2xl text-white shadow-sm transition ${mode === "all" ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}>
          {mode === "all" ? "กลับเป็นนำร่อง" : "เปิดรับทุกคน"}
        </button>
      </div>

      {mode !== "all" && (
        <>
          {/* สถิติ */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <div className="text-3xl font-black text-emerald-600 tabular-nums">{emps.length}</div>
              <div className="text-xs text-slate-500 font-bold mt-1">คนที่เปิดสิทธิ์</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <div className="text-3xl font-black text-blue-600 tabular-nums">{enabledDeps}</div>
              <div className="text-xs text-slate-500 font-bold mt-1">แผนกที่เปิดทั้งแผนก</div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <div className="text-3xl font-black text-slate-700 tabular-nums">{deps.length}</div>
              <div className="text-xs text-slate-500 font-bold mt-1">แผนกทั้งหมด</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* รายคน */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-slate-800 flex items-center gap-2"><UserCheck size={18} className="text-emerald-600" /> เปิดสิทธิ์รายคน</span>
                <button onClick={() => setAdding((v) => !v)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm"><Plus size={14} /> เพิ่มคน</button>
              </div>
              {adding && (
                <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4 space-y-2.5">
                  {pick.size > 0 && <div className="flex gap-1.5 flex-wrap">{Array.from(pick.values()).map((e) => <span key={e.id} className="inline-flex items-center gap-1 text-xs bg-white border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full">{empName(e)}<button onClick={() => toggle(e)}><X size={12} /></button></span>)}</div>}
                  <EmpPicker selected={pick} onToggle={toggle} />
                  <button onClick={addEmps} disabled={pick.size === 0} className="w-full py-2.5 bg-emerald-600 disabled:opacity-40 text-white text-sm font-black rounded-xl">✓ เปิดสิทธิ์ {pick.size} คน</button>
                </div>
              )}
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {emps.length === 0 && <div className="text-center py-8 text-slate-300 text-sm">ยังไม่เปิดให้ใคร<br /><span className="text-xs">กด "เพิ่มคน" เพื่อเริ่มนำร่อง</span></div>}
                {emps.map((e) => (
                  <div key={e.row_id} className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 grid place-items-center text-white"><UserCheck size={15} /></div>
                    <span className="flex-1 text-sm font-semibold text-slate-700">{e.name}</span>
                    <button onClick={() => rmEmp(e.row_id)} className="p-1.5 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-rose-500"><X size={15} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* รายแผนก */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
              <span className="text-base font-black text-slate-800 flex items-center gap-2"><Building2 size={18} className="text-blue-600" /> เปิดทั้งแผนก <span className="text-xs text-slate-400 font-bold">(ติ๊กเพื่อเปิดทั้งแผนก)</span></span>
              <div className="grid sm:grid-cols-2 gap-2 max-h-[28rem] overflow-y-auto pr-1">
                {deps.map((d) => (
                  <button key={d.department_id} onClick={() => toggleDep(d)}
                    className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 text-left text-sm font-semibold transition ${d.enabled ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm" : "bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50"}`}>
                    <span className={`w-5 h-5 rounded-md border-2 grid place-items-center flex-none ${d.enabled ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>{d.enabled && <Check size={13} className="text-white" />}</span>
                    <span className="truncate">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3.5 text-sm text-blue-800 flex items-start gap-2.5">
            <span className="text-lg">💡</span>
            <div>เปิดสิทธิ์ <b>4 คนนำร่อง</b>ได้เลยตอนนี้ · การส่งจะ<b>ข้ามคนที่ยังไม่เปิดสิทธิ์</b>โดยอัตโนมัติ (ขึ้น "ยังไม่เปิดสิทธิ์" ในประวัติ) · เมื่อพร้อมใช้ทั้งบริษัทค่อยกด <b>"เปิดรับทุกคน"</b></div>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════ สิทธิ์ผู้ส่ง ═══════════════
function SendersPanel() {
  const [senders, setSenders] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [adding, setAdding] = useState(false); const [pick, setPick] = useState<Map<string, Emp>>(new Map())
  const load = useCallback(() => { setLoading(true); fetch("/api/admin/notifications/senders").then((r) => r.json()).then((j) => { setSenders(j.senders ?? []); setLoading(false) }) }, [])
  useEffect(() => { load() }, [load])
  const add = async () => { if (pick.size === 0) return; const r = await fetch("/api/admin/notifications/senders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employee_ids: Array.from(pick.keys()) }) }); if (!r.ok) { const j = await r.json(); return toast.error(j.error || "เพิ่มไม่สำเร็จ") } toast.success("เพิ่มผู้ส่งแล้ว"); setPick(new Map()); setAdding(false); load() }
  const remove = async (id: string) => { const r = await fetch(`/api/admin/notifications/senders?id=${id}`, { method: "DELETE" }); if (r.ok) { toast.success("ลบแล้ว"); load() } }
  const toggle = (e: Emp) => setPick((m) => { const n = new Map(m); n.has(e.id) ? n.delete(e.id) : n.set(e.id, e); return n })
  return (
    <div className="space-y-3 max-w-2xl">
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-center gap-2"><ShieldCheck size={15} /> <b>super_admin</b> และ <b>hr_admin</b> ส่งได้เสมอ · ด้านล่างคือคนอื่นที่คุณอนุญาตเพิ่ม</div>
      <div className="flex items-center justify-between"><span className="text-sm font-black text-slate-700">ผู้ส่งที่อนุญาตเพิ่ม ({senders.length})</span><button onClick={() => setAdding((v) => !v)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-lg flex items-center gap-1"><Plus size={13} /> เพิ่มผู้ส่ง</button></div>
      {adding && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
          {pick.size > 0 && <div className="flex gap-1 flex-wrap">{Array.from(pick.values()).map((e) => <span key={e.id} className="inline-flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{empName(e)}<button onClick={() => toggle(e)}><X size={11} /></button></span>)}</div>}
          <EmpPicker selected={pick} onToggle={toggle} />
          <button onClick={add} disabled={pick.size === 0} className="w-full py-2 bg-emerald-600 disabled:opacity-40 text-white text-sm font-black rounded-xl">ยืนยันเพิ่ม {pick.size} คน</button>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
        {loading && <div className="py-8 text-center text-slate-400"><Loader2 className="animate-spin inline" /></div>}
        {!loading && senders.length === 0 && <div className="py-8 text-center text-slate-400 text-sm">ยังไม่มีผู้ส่งเพิ่มเติม</div>}
        {senders.map((s) => (
          <div key={s.id} className="flex items-center gap-2 px-4 py-2.5"><Users size={15} className="text-slate-400" /><span className="flex-1 text-sm text-slate-700">{empName(s.employee)}</span><span className="text-[10px] text-slate-400">{s.employee?.department?.name || ""}</span><button onClick={() => remove(s.id)} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500"><Trash2 size={14} /></button></div>
        ))}
      </div>
    </div>
  )
}
