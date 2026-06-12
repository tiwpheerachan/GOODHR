"use client"
import { useEffect, useState } from "react"
import {
  Loader2, Link2, Unlink, Search, X, Check, AlertCircle,
  Mail, Phone, Building2, Tag, Calendar, User, Globe, ShieldCheck, BadgeCheck,
  GraduationCap, MapPin, Briefcase,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"

// ── Brand parser + color (เหมือนกับหน้า /admin/feishu-users) ──
function parseBrands(raw: string | null): string[] {
  if (!raw) return []
  return raw.split(/[,/、&、，；;]|\s+(?=[A-Z一-龥])/g).map(s => s.trim()).filter(Boolean)
}
function brandColor(brand: string): string {
  const u = brand.toUpperCase()
  if (u.includes("DDPAI")) return "bg-blue-100 text-blue-700"
  if (u.includes("ANKER")) return "bg-sky-100 text-sky-700"
  if (u.includes("DREAME")) return "bg-purple-100 text-purple-700"
  if (u.includes("WANBO")) return "bg-amber-100 text-amber-700"
  if (u.includes("AKASO")) return "bg-rose-100 text-rose-700"
  if (u.includes("MOVA")) return "bg-emerald-100 text-emerald-700"
  if (u.includes("VINKO")) return "bg-teal-100 text-teal-700"
  if (u.includes("XIAOMI") || u.includes("70MAI")) return "bg-orange-100 text-orange-700"
  if (u.includes("MOLLY")) return "bg-pink-100 text-pink-700"
  if (u.includes("LEVOIT")) return "bg-cyan-100 text-cyan-700"
  if (u.includes("JIMMY") || u.includes("JISULIFE")) return "bg-yellow-100 text-yellow-800"
  if (u.includes("SOUNDCORE")) return "bg-violet-100 text-violet-700"
  if (u.includes("UWANT") || u.includes("PERYSMITH")) return "bg-fuchsia-100 text-fuchsia-700"
  if (u.includes("TOP")) return "bg-lime-100 text-lime-700"
  if (u.includes("ZEVIA") || u.includes("AMAZFIT") || u.includes("MIBRO")) return "bg-indigo-100 text-indigo-700"
  return "bg-slate-100 text-slate-700"
}

export default function FeishuLinkTab({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [feishuUser, setFeishuUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/feishu-users?goodhr_employee_id=${employeeId}`)
      const d = await res.json()
      setFeishuUser(d.user || null)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [employeeId])

  const unlink = async () => {
    if (!feishuUser) return
    if (!confirm(`ยกเลิกการเชื่อม "${feishuUser.name_cn || feishuUser.name}" ออกจาก ${employeeName}?`)) return
    const res = await fetch("/api/feishu-users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feishu_user_id: feishuUser.feishu_user_id, goodhr_employee_id: null }),
    })
    if (res.ok) { toast.success("ยกเลิกแล้ว"); load() }
    else toast.error("ไม่สำเร็จ")
  }

  if (loading) return <div className="text-center py-8"><Loader2 size={20} className="animate-spin mx-auto text-slate-300"/></div>

  // ── ยังไม่ map ──
  if (!feishuUser) {
    return (
      <div>
        {searchOpen ? (
          <SearchPanel employeeId={employeeId} employeeName={employeeName}
            onClose={() => setSearchOpen(false)}
            onLinked={() => { setSearchOpen(false); load() }}/>
        ) : (
          <div className="text-center py-10">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center mb-4">
              <Link2 size={32} className="text-indigo-300"/>
            </div>
            <h3 className="font-black text-slate-800 text-base">ยังไม่ได้เชื่อมกับ Feishu</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              เชื่อมพนักงานคนนี้กับบัญชี Feishu เพื่อให้ระบบรู้ว่าเป็นคนเดียวกัน — ใช้สำหรับ sync ข้อมูลและการแจ้งเตือนข้ามระบบ
            </p>
            <button onClick={() => setSearchOpen(true)}
              className="mt-5 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-black rounded-xl inline-flex items-center gap-1.5 shadow">
              <Link2 size={14}/> เชื่อมกับ Feishu User
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Map แล้ว — แสดง Feishu detail ──
  const f = feishuUser
  const brands = parseBrands(f.brand)
  const deptParts = f.department_path?.split("/").map((s: string) => s.trim()).filter(Boolean) ?? []

  return (
    <div className="space-y-4">
      {/* Header status */}
      <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-xl font-black shadow flex-shrink-0">
            {f.name_cn?.[0] || f.name_en?.[0] || f.nickname?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-black text-base text-slate-800">{f.name_cn || f.name}</p>
              {f.nickname && <span className="text-rose-500 text-sm font-bold">({f.nickname})</span>}
              {f.manually_verified
                ? <span className="text-[9px] font-black bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><ShieldCheck size={9}/> Verified</span>
                : <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{f.match_confidence}% · {f.match_method}</span>}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Feishu ID: <span className="text-indigo-600">{f.feishu_user_id}</span>
              {f.matched_at && <span className="ml-2 text-slate-400">· เชื่อมเมื่อ {format(new Date(f.matched_at), "d MMM yyyy HH:mm")}</span>}
            </p>
          </div>
          <button onClick={unlink}
            className="px-2.5 py-1.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black rounded-lg flex items-center gap-1 flex-shrink-0">
            <Unlink size={11}/> ยกเลิก
          </button>
        </div>
      </div>

      {/* Identity */}
      <Section icon={<User size={14}/>} title="ชื่อ (Multi-language)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="ชื่อ Default" value={f.name}/>
          {f.name_cn && <Field label="中文" value={f.name_cn}/>}
          {f.name_en && <Field label="English" value={f.name_en}/>}
          {f.name_jp && <Field label="日本語" value={f.name_jp}/>}
          {f.english_name_custom && <Field label="英文名 (custom)" value={f.english_name_custom}/>}
          {f.nickname && <Field label="Nickname" value={f.nickname} highlight/>}
        </div>
      </Section>

      {/* Employee info */}
      <Section icon={<Briefcase size={14}/>} title="ข้อมูลพนักงาน">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {f.employee_number && <Field label="รหัสพนักงาน Feishu" value={f.employee_number} mono/>}
          {f.job_title && <Field label="ตำแหน่ง" value={f.job_title}/>}
          {f.workforce_type && <Field label="ประเภทการจ้าง" value={f.workforce_type}/>}
          {f.start_date && <Field label="วันเริ่มงาน" value={f.start_date}/>}
          {f.gender && <Field label="เพศ" value={f.gender}/>}
          {f.city && <Field label="เมือง" value={f.city}/>}
          {f.status && <Field label="สถานะ" value={f.status}/>}
        </div>
      </Section>

      {/* Department */}
      {deptParts.length > 0 && (
        <Section icon={<Building2 size={14}/>} title="แผนก (Department Path)">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {deptParts.map((p: string, i: number) => (
              <span key={i} className="flex items-center gap-1">
                <span className={"px-2.5 py-1 rounded-lg font-bold " +
                  (i === deptParts.length - 1
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-100 text-slate-600")}>
                  {p}
                </span>
                {i < deptParts.length - 1 && <span className="text-slate-300">/</span>}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Brands */}
      {brands.length > 0 && (
        <Section icon={<Tag size={14}/>} title={`แบรนด์ที่ดูแล (${brands.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {brands.map((b, i) => (
              <span key={i} className={"text-xs font-black px-2.5 py-1 rounded-lg " + brandColor(b)}>{b}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Contact */}
      <Section icon={<Phone size={14}/>} title="ติดต่อ">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {f.email && <Field label="Email" value={f.email} icon={<Mail size={10}/>}/>}
          {f.email_work && f.email_work !== f.email && <Field label="Work Email" value={f.email_work}/>}
          {f.phone && <Field label="โทรศัพท์" value={f.phone} icon={<Phone size={10}/>}/>}
        </div>
      </Section>

      {/* Mentor */}
      {(f.mentor || f.direct_manager_raw) && (
        <Section icon={<GraduationCap size={14}/>} title="ลำดับการบริหาร">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {f.direct_manager_raw && <Field label="หัวหน้างานตรง" value={f.direct_manager_raw}/>}
            {f.mentor && <Field label="พี่เลี้ยง (导师)" value={f.mentor}/>}
          </div>
        </Section>
      )}

      {/* System */}
      <Section icon={<Globe size={14}/>} title="ข้อมูลระบบ">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Feishu User ID" value={f.feishu_user_id} mono/>
          {f.imported_at && <Field label="Imported" value={format(new Date(f.imported_at), "d MMM yyyy HH:mm")}/>}
        </div>
        {f.match_note && (
          <p className="text-[10px] text-slate-500 italic mt-2 bg-slate-50 px-2 py-1 rounded">หมายเหตุ: "{f.match_note}"</p>
        )}
      </Section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
function SearchPanel({ employeeId, employeeName, onClose, onLinked }: any) {
  const [q, setQ] = useState(employeeName || "")
  const [results, setResults] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState("")

  useEffect(() => {
    const t = setTimeout(async () => {
      const params = new URLSearchParams({ q: q.trim(), filter: "unmatched", limit: "30" })
      const res = await fetch(`/api/feishu-users?${params}`)
      const d = await res.json()
      setResults(d.users ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  const link = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch("/api/feishu-users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feishu_user_id: selected.feishu_user_id,
          goodhr_employee_id: employeeId,
          manually_verified: true,
          match_note: note || `Linked from /admin/employees/${employeeId}`,
        }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ไม่สำเร็จ"); return }
      toast.success("เชื่อมเรียบร้อย ✓")
      onLinked()
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-black text-slate-800 text-sm">ค้นบัญชี Feishu ที่ยังไม่ได้ map</p>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-700">ยกเลิก</button>
      </div>

      <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
        <Search size={13} className="text-slate-400"/>
        <input value={q} onChange={e => setQ(e.target.value)} autoFocus
          placeholder="ค้นชื่อจีน / nickname / Feishu User ID / email..."
          className="flex-1 bg-transparent outline-none text-sm"/>
        {q && <button onClick={() => setQ("")}><X size={12} className="text-slate-400"/></button>}
      </div>

      {selected && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm truncate">{selected.name_cn || selected.name}
                {selected.nickname && <span className="text-rose-500 text-xs ml-1">({selected.nickname})</span>}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">{selected.feishu_user_id}</p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 hover:bg-white rounded"><X size={12}/></button>
          </div>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="หมายเหตุ (ไม่บังคับ)..."
            className="w-full mt-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-emerald-400"/>
          <button onClick={link} disabled={saving}
            className="w-full mt-2 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white text-sm font-black rounded-lg flex items-center justify-center gap-1">
            {saving ? <Loader2 size={13} className="animate-spin"/> : <BadgeCheck size={13}/>}
            ยืนยันการเชื่อม (Verified)
          </button>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
        {results.length === 0 ? (
          <p className="text-center py-6 text-xs text-slate-400">{q ? "ไม่พบ" : "พิมพ์ค้น..."}</p>
        ) : results.map((u: any) => (
          <button key={u.id} onClick={() => setSelected(u)}
            disabled={selected?.id === u.id}
            className={"w-full text-left px-3 py-2 hover:bg-indigo-50/50 flex items-center gap-2 " +
              (selected?.id === u.id ? "bg-emerald-50" : "")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center text-xs font-black flex-shrink-0">
              {u.name_cn?.[0] || u.name_en?.[0] || u.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black truncate">
                {u.name_cn || u.name}
                {u.nickname && <span className="text-rose-500 ml-1">({u.nickname})</span>}
              </p>
              <p className="text-[9px] text-slate-400 font-mono truncate">
                {u.feishu_user_id}
                {u.employee_number && ` · ${u.employee_number}`}
                {u.email && ` · ${u.email}`}
              </p>
              {u.department_path && (
                <p className="text-[9px] text-slate-400 truncate">{u.department_path.split("/").slice(-2).join(" / ")}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
function Section({ icon, title, children }: any) {
  return (
    <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-3">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        {icon} {title}
      </p>
      {children}
    </div>
  )
}
function Field({ label, value, mono, highlight, icon }: any) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
      <p className={"text-[12px] mt-0.5 flex items-center gap-1 " +
        (highlight ? "font-black text-rose-600" : "font-bold text-slate-700") + " " +
        (mono ? "font-mono" : "")}>
        {icon && <span className="text-slate-400 flex-shrink-0">{icon}</span>}
        <span className="truncate">{value || "—"}</span>
      </p>
    </div>
  )
}
