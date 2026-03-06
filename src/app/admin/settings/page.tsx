"use client"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  Save, Plus, Trash2, MapPin, Clock, Calendar,
  Building2, ChevronDown, ChevronRight, Loader2,
  Edit2, X, Check, Sun
} from "lucide-react"
import toast from "react-hot-toast"

// ── shared styles ──────────────────────────────────────────────────────
const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all w-full"
const inpSm = "bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-indigo-400 transition-all w-full"
const COMPANY_COLORS = ["bg-indigo-500","bg-emerald-500","bg-violet-500","bg-rose-500"]
const COMPANY_LIGHT  = ["bg-indigo-50 border-indigo-200","bg-emerald-50 border-emerald-200","bg-violet-50 border-violet-200","bg-rose-50 border-rose-200"]
const COMPANY_TEXT   = ["text-indigo-700","text-emerald-700","text-violet-700","text-rose-700"]

// ── modal wrapper ──────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-sm">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X size={14}/></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ── Company Info Tab ───────────────────────────────────────────────────
function CompanyTab({ company, onSaved }: { company: any; onSaved: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({ ...company })
  const [saving, setSaving] = useState(false)

  useEffect(() => { setForm({ ...company }) }, [company.id])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from("companies").update({
      name_th: form.name_th, name_en: form.name_en,
      phone: form.phone, email: form.email,
      address: form.address, tax_id: form.tax_id,
    }).eq("id", company.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success("✓ บันทึกข้อมูลบริษัทแล้ว")
    onSaved()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-black text-slate-700 text-sm">ข้อมูลบริษัท</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { k: "name_th", l: "ชื่อบริษัท (ไทย) *" },
            { k: "name_en", l: "ชื่อบริษัท (EN)" },
            { k: "phone",   l: "เบอร์โทร" },
            { k: "email",   l: "อีเมล" },
            { k: "tax_id",  l: "เลขนิติบุคคล / ผู้เสียภาษี" },
          ].map(({ k, l }) => (
            <div key={k}>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">{l}</label>
              <input value={form[k] || ""} onChange={e => setForm((f: any) => ({ ...f, [k]: e.target.value }))} className={inp}/>
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">ที่อยู่</label>
          <textarea value={form.address || ""} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))}
            className={inp + " h-20 resize-none"}/>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>} บันทึก
        </button>
      </div>
      <div className="space-y-4">
        <h3 className="font-black text-slate-700 text-sm">ข้อมูลเพิ่มเติม</h3>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Company ID</p>
            <p className="text-xs font-mono text-indigo-600 break-all">{company.id}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Code</p>
            <p className="text-sm font-black text-slate-700">{company.code}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">สถานะ</p>
            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-lg">
              {company.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Branches Tab ───────────────────────────────────────────────────────
function BranchesTab({ companyId }: { companyId: string }) {
  const supabase = createClient()
  const [branches, setBranches] = useState<any[]>([])
  const [modal, setModal] = useState<any>(null) // null | {} | existing branch
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from("branches").select("*").eq("company_id", companyId).order("name")
    setBranches(data ?? [])
  }, [companyId])

  useEffect(() => { load() }, [load])

  const openAdd  = () => { setForm({ timezone: "Asia/Bangkok", geo_radius_m: 200 }); setModal("add") }
  const openEdit = (b: any) => { setForm({ ...b }); setModal("edit") }

  const save = async () => {
    if (!form.name) return toast.error("กรุณากรอกชื่อสาขา")
    setSaving(true)
    if (modal === "add") {
      const { error } = await supabase.from("branches").insert({
        company_id: companyId, name: form.name, code: form.code || form.name.slice(0,4).toUpperCase(),
        address: form.address, latitude: form.latitude || null, longitude: form.longitude || null,
        geo_radius_m: Number(form.geo_radius_m) || 200, timezone: form.timezone || "Asia/Bangkok",
      })
      if (error) { toast.error(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from("branches").update({
        name: form.name, address: form.address,
        latitude: form.latitude || null, longitude: form.longitude || null,
        geo_radius_m: Number(form.geo_radius_m) || 200, timezone: form.timezone,
      }).eq("id", form.id)
      if (error) { toast.error(error.message); setSaving(false); return }
    }
    toast.success(modal === "add" ? "✓ เพิ่มสาขาแล้ว" : "✓ แก้ไขสาขาแล้ว")
    setSaving(false); setModal(null); load()
  }

  const remove = async (id: string) => {
    if (!confirm("ลบสาขานี้?")) return
    await supabase.from("branches").delete().eq("id", id)
    toast.success("✓ ลบสาขาแล้ว"); load()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-slate-700 text-sm">สาขา / ที่ตั้ง ({branches.length})</h3>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
          <Plus size={12}/> เพิ่มสาขา
        </button>
      </div>
      <div className="space-y-2.5">
        {branches.length === 0 && <p className="text-center text-slate-300 py-8 text-sm">ยังไม่มีสาขา</p>}
        {branches.map(b => (
          <div key={b.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin size={13} className="text-indigo-600"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm">{b.name}
                <span className="text-slate-400 font-normal text-xs ml-2">{b.code}</span>
              </p>
              {b.address && <p className="text-xs text-slate-400 mt-0.5 truncate">{b.address}</p>}
              {b.latitude && (
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  {b.latitude}, {b.longitude} · รัศมี {b.geo_radius_m}m · {b.timezone}
                </p>
              )}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => openEdit(b)} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"><Edit2 size={12}/></button>
              <button onClick={() => remove(b.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal === "add" ? "เพิ่มสาขา" : "แก้ไขสาขา"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            {[
              { k:"name",         l:"ชื่อสาขา *" },
              { k:"code",         l:"รหัสสาขา" },
              { k:"address",      l:"ที่อยู่" },
              { k:"latitude",     l:"Latitude" },
              { k:"longitude",    l:"Longitude" },
              { k:"geo_radius_m", l:"รัศมีเช็คอิน (เมตร)" },
              { k:"timezone",     l:"Timezone" },
            ].map(({ k, l }) => (
              <div key={k}>
                <label className="text-xs font-bold text-slate-500 mb-1 block">{l}</label>
                <input value={form[k] || ""} onChange={e => setForm((f: any) => ({ ...f, [k]: e.target.value }))} className={inp}/>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} บันทึก
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Shifts Tab ─────────────────────────────────────────────────────────
function ShiftsTab({ companyId }: { companyId: string }) {
  const supabase = createClient()
  const [shifts, setShifts] = useState<any[]>([])
  const [modal,  setModal]  = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form,   setForm]   = useState<any>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from("shift_templates").select("*").eq("company_id", companyId).order("name")
    setShifts(data ?? [])
  }, [companyId])

  useEffect(() => { load() }, [load])

  const openAdd  = () => { setForm({ break_minutes: 60, ot_start_after_minutes: 30, shift_type: "regular" }); setModal("add") }
  const openEdit = (s: any) => { setForm({ ...s }); setModal("edit") }

  const save = async () => {
    if (!form.name || !form.work_start || !form.work_end) return toast.error("กรุณากรอกข้อมูลให้ครบ")
    setSaving(true)
    const payload = {
      company_id: companyId, name: form.name, shift_type: form.shift_type || "regular",
      work_start: form.work_start, work_end: form.work_end,
      is_overnight: form.is_overnight || false,
      break_minutes: Number(form.break_minutes) || 60,
      ot_start_after_minutes: Number(form.ot_start_after_minutes) || 30,
      flex_start_from: form.flex_start_from || null,
      flex_start_until: form.flex_start_until || null,
    }
    const { error } = modal === "add"
      ? await supabase.from("shift_templates").insert(payload)
      : await supabase.from("shift_templates").update(payload).eq("id", form.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(modal === "add" ? "✓ เพิ่มกะทำงานแล้ว" : "✓ แก้ไขกะทำงานแล้ว")
    setModal(null); load()
  }

  const remove = async (id: string) => {
    if (!confirm("ลบกะทำงานนี้?")) return
    await supabase.from("shift_templates").update({ is_active: false }).eq("id", id)
    toast.success("✓ ลบกะทำงานแล้ว"); load()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-slate-700 text-sm">กะทำงาน ({shifts.length})</h3>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
          <Plus size={12}/> เพิ่มกะ
        </button>
      </div>
      <div className="space-y-2.5">
        {shifts.length === 0 && <p className="text-center text-slate-300 py-8 text-sm">ยังไม่มีกะทำงาน</p>}
        {shifts.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock size={13} className="text-indigo-600"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm">{s.name}
                {s.is_overnight && <span className="ml-2 text-[10px] bg-purple-100 text-purple-600 font-bold px-1.5 py-0.5 rounded">ข้ามคืน</span>}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {s.work_start} – {s.work_end} · พัก {s.break_minutes}น.
                {s.flex_start_from && ` · Flex ${s.flex_start_from}–${s.flex_start_until}`}
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"><Edit2 size={12}/></button>
              <button onClick={() => remove(s.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal === "add" ? "เพิ่มกะทำงาน" : "แก้ไขกะทำงาน"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อกะ *</label>
              <input value={form.name || ""} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className={inp}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">เริ่มงาน *</label>
                <input type="time" value={form.work_start || ""} onChange={e => setForm((f: any) => ({ ...f, work_start: e.target.value }))} className={inp}/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">เลิกงาน *</label>
                <input type="time" value={form.work_end || ""} onChange={e => setForm((f: any) => ({ ...f, work_end: e.target.value }))} className={inp}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">พักกลางวัน (นาที)</label>
                <input type="number" value={form.break_minutes || 60} onChange={e => setForm((f: any) => ({ ...f, break_minutes: e.target.value }))} className={inp}/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">นับ OT หลัง (นาที)</label>
                <input type="number" value={form.ot_start_after_minutes || 30} onChange={e => setForm((f: any) => ({ ...f, ot_start_after_minutes: e.target.value }))} className={inp}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Flex เข้าตั้งแต่</label>
                <input type="time" value={form.flex_start_from || ""} onChange={e => setForm((f: any) => ({ ...f, flex_start_from: e.target.value }))} className={inp}/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Flex เข้าถึง</label>
                <input type="time" value={form.flex_start_until || ""} onChange={e => setForm((f: any) => ({ ...f, flex_start_until: e.target.value }))} className={inp}/>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_overnight || false}
                onChange={e => setForm((f: any) => ({ ...f, is_overnight: e.target.checked }))}
                className="w-4 h-4 rounded accent-indigo-600"/>
              <span className="text-sm font-semibold text-slate-700">กะข้ามคืน</span>
            </label>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} บันทึก
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Leave Types Tab ────────────────────────────────────────────────────
function LeaveTypesTab({ companyId }: { companyId: string }) {
  const supabase = createClient()
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [modal,      setModal]      = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState<any>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from("leave_types").select("*").eq("company_id", companyId).order("name")
    setLeaveTypes(data ?? [])
  }, [companyId])

  useEffect(() => { load() }, [load])

  const openAdd  = () => { setForm({ is_paid: true, carry_over: false, require_document: false, days_per_year: 6, color_hex: "#6366f1" }); setModal("add") }
  const openEdit = (lt: any) => { setForm({ ...lt }); setModal("edit") }

  const save = async () => {
    if (!form.name || !form.code) return toast.error("กรุณากรอกชื่อและรหัสประเภทลา")
    setSaving(true)
    const payload = {
      company_id: companyId, name: form.name, code: form.code,
      is_paid: form.is_paid ?? true, days_per_year: Number(form.days_per_year) || null,
      carry_over: form.carry_over ?? false, require_document: form.require_document ?? false,
      color_hex: form.color_hex || "#6366f1", is_active: true,
    }
    const { error } = modal === "add"
      ? await supabase.from("leave_types").insert(payload)
      : await supabase.from("leave_types").update(payload).eq("id", form.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(modal === "add" ? "✓ เพิ่มประเภทลาแล้ว" : "✓ แก้ไขแล้ว")
    setModal(null); load()
  }

  const remove = async (id: string) => {
    if (!confirm("ลบประเภทการลานี้?")) return
    await supabase.from("leave_types").update({ is_active: false }).eq("id", id)
    toast.success("✓ ลบแล้ว"); load()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-slate-700 text-sm">ประเภทการลา ({leaveTypes.filter(l => l.is_active).length})</h3>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
          <Plus size={12}/> เพิ่มประเภทลา
        </button>
      </div>
      <div className="space-y-2.5">
        {leaveTypes.filter(l => l.is_active).length === 0 && <p className="text-center text-slate-300 py-8 text-sm">ยังไม่มีประเภทการลา</p>}
        {leaveTypes.filter(l => l.is_active).map(lt => (
          <div key={lt.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: lt.color_hex || "#6366f1" }}/>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm">{lt.name}
                <span className="text-slate-400 font-normal text-xs ml-2">{lt.code}</span>
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {lt.days_per_year && <span className="text-[10px] text-slate-500">{lt.days_per_year} วัน/ปี</span>}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lt.is_paid ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {lt.is_paid ? "ได้รับค่าจ้าง" : "ไม่ได้รับค่าจ้าง"}
                </span>
                {lt.carry_over && <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">สะสมวันลาได้</span>}
                {lt.require_document && <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">ต้องมีเอกสาร</span>}
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => openEdit(lt)} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"><Edit2 size={12}/></button>
              <button onClick={() => remove(lt.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={modal === "add" ? "เพิ่มประเภทการลา" : "แก้ไขประเภทการลา"} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">ชื่อ *</label>
                <input value={form.name || ""} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className={inp}/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">รหัส *</label>
                <input value={form.code || ""} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} className={inp} placeholder="เช่น ANNUAL"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">วัน/ปี</label>
                <input type="number" value={form.days_per_year || ""} onChange={e => setForm((f: any) => ({ ...f, days_per_year: e.target.value }))} className={inp}/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">สีป้าย</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color_hex || "#6366f1"}
                    onChange={e => setForm((f: any) => ({ ...f, color_hex: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-1"/>
                  <input value={form.color_hex || "#6366f1"} onChange={e => setForm((f: any) => ({ ...f, color_hex: e.target.value }))} className={inp}/>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { k: "is_paid",          l: "ได้รับค่าจ้างระหว่างลา" },
                { k: "carry_over",       l: "สะสมวันลาข้ามปีได้" },
                { k: "require_document", l: "ต้องแนบเอกสาร" },
              ].map(({ k, l }) => (
                <label key={k} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form[k] ?? false}
                    onChange={e => setForm((f: any) => ({ ...f, [k]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-indigo-600"/>
                  <span className="text-sm font-semibold text-slate-700">{l}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} บันทึก
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Holidays Tab ────────────────────────────────────────────────────────
function HolidaysTab({ companyId }: { companyId: string }) {
  const supabase = createClient()
  const currentYear = new Date().getFullYear()
  const [year,     setYear]     = useState(currentYear)
  const [holidays, setHolidays] = useState<any[]>([])
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form,     setForm]     = useState({ date: "", name: "" })

  const load = useCallback(async () => {
    const { data } = await supabase.from("company_holidays")
      .select("*").eq("company_id", companyId).eq("year", year)
      .eq("is_active", true).order("date")
    setHolidays(data ?? [])
  }, [companyId, year])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.date || !form.name) return toast.error("กรุณากรอกวันที่และชื่อวันหยุด")
    setSaving(true)
    const { error } = await supabase.from("company_holidays").upsert(
      { company_id: companyId, date: form.date, name: form.name, is_active: true },
      { onConflict: "company_id,date" }
    )
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success("✓ บันทึกวันหยุดแล้ว")
    setModal(false); setForm({ date: "", name: "" }); load()
  }

  const remove = async (id: string) => {
    if (!confirm("ลบวันหยุดนี้?")) return
    await supabase.from("company_holidays").update({ is_active: false }).eq("id", id)
    toast.success("✓ ลบแล้ว"); load()
  }

  const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]

  // group by month
  const grouped: Record<number, any[]> = {}
  holidays.forEach(h => {
    const m = new Date(h.date).getMonth()
    if (!grouped[m]) grouped[m] = []
    grouped[m].push(h)
  })

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-slate-700 text-sm">วันหยุดบริษัท</h3>
          <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg">
            {holidays.length} วัน / ปี {year + 543}
          </span>
        </div>
        <div className="flex gap-2">
          {/* year selector */}
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className={inpSm + " w-28"}>
            {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
              <option key={y} value={y}>ปี {y + 543}</option>
            ))}
          </select>
          <button onClick={() => { setForm({ date: "", name: "" }); setModal(true) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors">
            <Plus size={12}/> เพิ่มวันหยุด
          </button>
        </div>
      </div>

      {/* info */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mb-4 text-xs text-amber-700 flex items-start gap-2">
        <span className="flex-shrink-0 mt-0.5">ℹ️</span>
        <p>วันหยุดบริษัทจะ <strong>ไม่นับเป็นวันขาดงาน</strong> และแสดงบนปฏิทินพนักงาน (สีแดง) · ถ้าเข้างานวันหยุด จะคำนวณ OT อัตรา 1.0× / 3.0× ตามสูตร</p>
      </div>

      {/* calendar grid by month */}
      {holidays.length === 0 ? (
        <div className="text-center py-12 text-slate-300">
          <Calendar size={32} className="mx-auto mb-2"/>
          <p className="text-sm">ยังไม่มีวันหยุดปี {year + 543}</p>
          <p className="text-xs mt-1">กดปุ่ม "เพิ่มวันหยุด" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(grouped).sort(([a],[b]) => Number(a)-Number(b)).map(([mIdx, mHols]) => (
            <div key={mIdx} className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-rose-50 border-b border-rose-100">
                <p className="text-xs font-black text-rose-700">{MONTHS[Number(mIdx)]} {year + 543}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {mHols.map(h => (
                  <div key={h.id} className="flex items-center gap-2.5 px-3 py-2.5">
                    <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-[10px] font-black text-rose-700 flex-shrink-0">
                      {new Date(h.date).getDate()}
                    </div>
                    <p className="text-xs font-semibold text-slate-700 flex-1 leading-snug">{h.name}</p>
                    <button onClick={() => remove(h.id)}
                      className="p-1 hover:bg-red-100 rounded text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={11}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {modal && (
        <Modal title="เพิ่มวันหยุดบริษัท" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">วันที่ *</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className={inp}/>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">ชื่อวันหยุด *</label>
              <input value={form.name} placeholder="เช่น วันสงกรานต์"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inp}/>
            </div>
            {/* quick pick common holidays */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 mb-1.5">เลือกด่วน</p>
              <div className="flex flex-wrap gap-1.5">
                {["วันสงกรานต์","วันตรุษจีน","วันแรงงานแห่งชาติ","วันมาฆบูชา","วันวิสาขบูชา","วันเข้าพรรษา","วันออกพรรษา","วันขึ้นปีใหม่","วันสิ้นปี","วันปิยมหาราช"].map(n => (
                  <button key={n} onClick={() => setForm(f => ({ ...f, name: n }))}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                      form.name === n ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600 hover:border-indigo-300"
                    }`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                ยกเลิก
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>} บันทึก
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ── Main Settings Page ─────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const isSA = user?.role === "super_admin" || user?.role === "hr_admin"

  const [companies,      setCompanies]      = useState<any[]>([])
  const [selectedCompany,setSelectedCompany]= useState<any>(null)
  const [tab,            setTab]            = useState(0)
  const [loadingCo,      setLoadingCo]      = useState(true)

  const myCompanyId: string | undefined =
    user?.employee?.company_id ?? (user as any)?.company_id ?? undefined

  const TABS = [
    { label: "ข้อมูลบริษัท", icon: Building2 },
    { label: "สาขา",         icon: MapPin    },
    { label: "กะทำงาน",      icon: Clock     },
    { label: "ประเภทการลา",  icon: Calendar  },
    { label: "วันหยุดบริษัท",icon: Sun       },
  ]

  useEffect(() => {
    const load = async () => {
      setLoadingCo(true)
      if (isSA) {
        const { data } = await supabase.from("companies").select("*").eq("is_active", true).order("name_th")
        setCompanies(data ?? [])
        if (data && data.length > 0) setSelectedCompany(data[0])
      } else if (myCompanyId) {
        const { data } = await supabase.from("companies").select("*").eq("id", myCompanyId).single()
        if (data) { setCompanies([data]); setSelectedCompany(data) }
      }
      setLoadingCo(false)
    }
    if (user) load()
  }, [user, isSA, myCompanyId])

  if (loadingCo) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-800">ตั้งค่าระบบ</h2>
        <p className="text-slate-400 text-sm mt-0.5">จัดการข้อมูลบริษัท สาขา กะทำงาน และประเภทการลา</p>
      </div>

      {/* Company selector — super_admin เห็นทุกบริษัท */}
      {companies.length > 1 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {companies.map((c, i) => (
            <button key={c.id} onClick={() => { setSelectedCompany(c); setTab(0) }}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                selectedCompany?.id === c.id
                  ? `border-indigo-400 ${COMPANY_LIGHT[i % 4]}`
                  : "border-slate-100 bg-white hover:border-slate-200"
              }`}>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg text-white ${COMPANY_COLORS[i % 4]}`}>
                {c.code}
              </span>
              <p className={`text-lg font-black mt-2 ${selectedCompany?.id === c.id ? COMPANY_TEXT[i % 4] : "text-slate-800"}`}>
                {c.code}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5 font-semibold">
                {c.name_th.replace("บริษัท ", "").replace(" จำกัด", "")}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Selected company panel */}
      {selectedCompany && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Company title bar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black ${COMPANY_COLORS[companies.findIndex(c => c.id === selectedCompany.id) % 4]}`}>
              {selectedCompany.code.slice(0, 2)}
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">{selectedCompany.name_th}</p>
              <p className="text-xs text-slate-400">{selectedCompany.name_en}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-100">
            {TABS.map(({ label, icon: Icon }, i) => (
              <button key={label} onClick={() => setTab(i)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                  tab === i
                    ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}>
                <Icon size={13}/>{label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {tab === 0 && <CompanyTab key={selectedCompany.id} company={selectedCompany} onSaved={async () => {
              const { data } = await supabase.from("companies").select("*").eq("id", selectedCompany.id).single()
              if (data) { setSelectedCompany(data); setCompanies(cs => cs.map(c => c.id === data.id ? data : c)) }
            }}/>}
            {tab === 1 && <BranchesTab    key={selectedCompany.id + "-branches"} companyId={selectedCompany.id}/>}
            {tab === 2 && <ShiftsTab      key={selectedCompany.id + "-shifts"}   companyId={selectedCompany.id}/>}
            {tab === 3 && <LeaveTypesTab  key={selectedCompany.id + "-leave"}    companyId={selectedCompany.id}/>}
            {tab === 4 && <HolidaysTab    key={selectedCompany.id + "-holidays"} companyId={selectedCompany.id}/>}
          </div>
        </div>
      )}
    </div>
  )
}