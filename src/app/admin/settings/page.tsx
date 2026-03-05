"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Save, Loader2, Plus, Trash2, MapPin, Building2, Clock, Calendar, Pencil, X, Check } from "lucide-react"
import toast from "react-hot-toast"

const TABS = [
  { label: "บริษัท",       icon: Building2 },
  { label: "สาขา",         icon: MapPin    },
  { label: "กะทำงาน",     icon: Clock     },
  { label: "ประเภทการลา", icon: Calendar  },
]

const Field = ({ label, required, children, span2 }: any) => (
  <div className={span2 ? "col-span-2" : ""}>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
)
const cls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all placeholder-slate-300"
const Input = ({ className = "", ...props }: any) => <input {...props} className={cls + " " + className} />
const Sel = ({ children, ...props }: any) => <select {...props} className={cls}>{children}</select>
const SaveBtn = ({ onClick, loading }: any) => (
  <button onClick={onClick} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 mt-5">
    {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} บันทึก
  </button>
)

function Modal({ title, onClose, children, onSave }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
          <button onClick={onSave} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2">
            <Check size={14} /> บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [tab, setTab]           = useState(0)
  const [company, setCompany]   = useState<any>({})
  const [branches, setBranches] = useState<any[]>([])
  const [shifts, setShifts]     = useState<any[]>([])
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [modal, setModal]       = useState<{ type: string; data?: any } | null>(null)
  const [mf, setMf]             = useState<any>({})
  const setM = (k: string, v: any) => setMf((p: any) => ({ ...p, [k]: v }))

  const companyId = user?.employee?.company_id ?? (user as any)?.company_id

  const load = () => {
    if (!companyId) return
    supabase.from("companies").select("*").eq("id", companyId).single().then(({ data }) => setCompany(data ?? {}))
    supabase.from("branches").select("*").eq("company_id", companyId).order("name").then(({ data }) => setBranches(data ?? []))
    supabase.from("shift_templates").select("*").eq("company_id", companyId).order("name").then(({ data }) => setShifts(data ?? []))
    supabase.from("leave_types").select("*").eq("company_id", companyId).order("name").then(({ data }) => setLeaveTypes(data ?? []))
  }
  useEffect(() => { load() }, [companyId])

  const openModal = (type: string, data?: any) => {
    const defaults: Record<string, any> = {
      branch: { name: "", code: "", address: "", latitude: "", longitude: "", geo_radius_m: 200, timezone: "Asia/Bangkok", is_active: true },
      shift:  { name: "", work_start: "09:00", work_end: "18:00", late_threshold_min: 10, break_minutes: 60, ot_start_after_minutes: 30, is_overnight: false, shift_type: "normal", is_active: true },
      leave:  { name: "", code: "", days_per_year: 6, is_paid: true, carry_over: false, require_document: false, color_hex: "#6366f1", is_active: true },
    }
    setMf(data ? { ...data } : defaults[type])
    setModal({ type, data })
  }

  const saveCompany = async () => {
    setLoading(true)
    const { error } = await supabase.from("companies").update({
      name_th: company.name_th, name_en: company.name_en,
      phone: company.phone, email: company.email,
      address: company.address, tax_id: company.tax_id,
    }).eq("id", company.id)
    if (error) toast.error(error.message); else toast.success("บันทึกสำเร็จ")
    setLoading(false)
  }

  const saveBranch = async () => {
    const p = { ...mf, company_id: companyId, latitude: mf.latitude ? +mf.latitude : null, longitude: mf.longitude ? +mf.longitude : null, geo_radius_m: +mf.geo_radius_m }
    const { error } = mf.id ? await supabase.from("branches").update(p).eq("id", mf.id) : await supabase.from("branches").insert(p)
    if (error) toast.error(error.message); else { toast.success("บันทึกสำเร็จ"); setModal(null); load() }
  }

  const saveShift = async () => {
    const p = { ...mf, company_id: companyId }
    const { error } = mf.id ? await supabase.from("shift_templates").update(p).eq("id", mf.id) : await supabase.from("shift_templates").insert(p)
    if (error) toast.error(error.message); else { toast.success("บันทึกสำเร็จ"); setModal(null); load() }
  }

  const saveLeave = async () => {
    const p = { ...mf, company_id: companyId }
    const { error } = mf.id ? await supabase.from("leave_types").update(p).eq("id", mf.id) : await supabase.from("leave_types").insert(p)
    if (error) toast.error(error.message); else { toast.success("บันทึกสำเร็จ"); setModal(null); load() }
  }

  const saveFns: Record<string, () => void> = { branch: saveBranch, shift: saveShift, leave: saveLeave }

  const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#64748b"]

  return (
    <>
      {/* Modal */}
      {modal && (
        <Modal
          title={modal.type === "branch" ? (mf.id ? "แก้ไขสาขา" : "เพิ่มสาขา") : modal.type === "shift" ? (mf.id ? "แก้ไขกะ" : "เพิ่มกะทำงาน") : (mf.id ? "แก้ไขประเภทลา" : "เพิ่มประเภทการลา")}
          onClose={() => setModal(null)}
          onSave={saveFns[modal.type]}
        >
          {/* Branch fields */}
          {modal.type === "branch" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="ชื่อสาขา" required span2><Input value={mf.name || ""} onChange={(e: any) => setM("name", e.target.value)} placeholder="สำนักงานใหญ่" /></Field>
              <Field label="รหัสสาขา" required><Input value={mf.code || ""} onChange={(e: any) => setM("code", e.target.value)} placeholder="HQ" /></Field>
              <Field label="รัศมี Check-in (ม.)"><Input type="number" value={mf.geo_radius_m || 200} onChange={(e: any) => setM("geo_radius_m", e.target.value)} /></Field>
              <Field label="Latitude"><Input type="number" step="any" value={mf.latitude || ""} onChange={(e: any) => setM("latitude", e.target.value)} placeholder="13.660..." /></Field>
              <Field label="Longitude"><Input type="number" step="any" value={mf.longitude || ""} onChange={(e: any) => setM("longitude", e.target.value)} placeholder="100.393..." /></Field>
              <Field label="สถานะ"><Sel value={mf.is_active ? "1":"0"} onChange={(e:any) => setM("is_active", e.target.value==="1")}><option value="1">เปิดใช้งาน</option><option value="0">ปิด</option></Sel></Field>
              <Field label="ที่อยู่" span2>
                <textarea value={mf.address || ""} onChange={(e: any) => setM("address", e.target.value)} className={cls + " resize-none h-16"} />
              </Field>
            </div>
          )}
          {/* Shift fields */}
          {modal.type === "shift" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="ชื่อกะ" required span2><Input value={mf.name || ""} onChange={(e: any) => setM("name", e.target.value)} placeholder="กะปกติ 09:00-18:00" /></Field>
              <Field label="เวลาเข้างาน"><Input type="time" value={mf.work_start || "09:00"} onChange={(e: any) => setM("work_start", e.target.value)} /></Field>
              <Field label="เวลาเลิกงาน"><Input type="time" value={mf.work_end || "18:00"} onChange={(e: any) => setM("work_end", e.target.value)} /></Field>
              <Field label="ผ่อนผันสาย (นาที)"><Input type="number" value={mf.late_threshold_min ?? 10} onChange={(e: any) => setM("late_threshold_min", +e.target.value)} /></Field>
              <Field label="พักกลางวัน (นาที)"><Input type="number" value={mf.break_minutes ?? 60} onChange={(e: any) => setM("break_minutes", +e.target.value)} /></Field>
              <Field label="เริ่มนับ OT หลัง (นาที)"><Input type="number" value={mf.ot_start_after_minutes ?? 30} onChange={(e: any) => setM("ot_start_after_minutes", +e.target.value)} /></Field>
              <Field label="ประเภท"><Sel value={mf.shift_type || "normal"} onChange={(e:any) => setM("shift_type",e.target.value)}><option value="normal">ปกติ</option><option value="flex">Flexible</option><option value="night">กะดึก</option><option value="split">Split</option></Sel></Field>
              <Field label="ข้ามคืน"><Sel value={mf.is_overnight?"1":"0"} onChange={(e:any) => setM("is_overnight",e.target.value==="1")}><option value="0">ไม่ข้ามคืน</option><option value="1">ข้ามคืน</option></Sel></Field>
            </div>
          )}
          {/* Leave type fields */}
          {modal.type === "leave" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="ชื่อประเภทลา" required><Input value={mf.name || ""} onChange={(e: any) => setM("name", e.target.value)} placeholder="ลาป่วย" /></Field>
              <Field label="รหัส" required><Input value={mf.code || ""} onChange={(e: any) => setM("code", e.target.value)} placeholder="SICK" /></Field>
              <Field label="วันที่ได้/ปี"><Input type="number" value={mf.days_per_year ?? 6} onChange={(e: any) => setM("days_per_year", +e.target.value)} /></Field>
              <Field label="ประเภท"><Sel value={mf.is_paid?"1":"0"} onChange={(e:any) => setM("is_paid",e.target.value==="1")}><option value="1">มีเงินเดือน</option><option value="0">ไม่มีเงินเดือน</option></Sel></Field>
              <Field label="สะสมข้ามปี"><Sel value={mf.carry_over?"1":"0"} onChange={(e:any) => setM("carry_over",e.target.value==="1")}><option value="0">ไม่สะสม</option><option value="1">สะสมได้</option></Sel></Field>
              <Field label="ต้องใช้เอกสาร"><Sel value={mf.require_document?"1":"0"} onChange={(e:any) => setM("require_document",e.target.value==="1")}><option value="0">ไม่ต้องการ</option><option value="1">ต้องการ</option></Sel></Field>
              <Field label="สีแสดงผล" span2>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setM("color_hex", c)}
                      className={"w-7 h-7 rounded-full border-2 transition-all " + (mf.color_hex === c ? "border-slate-800 scale-110" : "border-transparent")}
                      style={{ backgroundColor: c }} />
                  ))}
                  <Input value={mf.color_hex || ""} onChange={(e: any) => setM("color_hex", e.target.value)} className="w-28 text-xs" placeholder="#6366f1" />
                </div>
              </Field>
            </div>
          )}
        </Modal>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ตั้งค่าระบบ</h2>
          <p className="text-slate-400 text-sm mt-1">จัดการข้อมูลบริษัท สาขา กะทำงาน และประเภทการลา</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(({ label, icon: Icon }, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === i ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* Tab 0 — บริษัท */}
        {tab === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left — ข้อมูลบริษัท */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-black text-slate-800 mb-5">ข้อมูลบริษัท</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="ชื่อบริษัท (ไทย)" required><Input value={company.name_th || ""} onChange={(e: any) => setCompany((c: any) => ({ ...c, name_th: e.target.value }))} /></Field>
                <Field label="ชื่อบริษัท (EN)"><Input value={company.name_en || ""} onChange={(e: any) => setCompany((c: any) => ({ ...c, name_en: e.target.value }))} /></Field>
                <Field label="เลขนิติบุคคล / ผู้เสียภาษี" span2><Input value={company.tax_id || ""} onChange={(e: any) => setCompany((c: any) => ({ ...c, tax_id: e.target.value }))} placeholder="0000000000000" /></Field>
                <Field label="เบอร์โทร"><Input value={company.phone || ""} onChange={(e: any) => setCompany((c: any) => ({ ...c, phone: e.target.value }))} /></Field>
                <Field label="อีเมล"><Input value={company.email || ""} onChange={(e: any) => setCompany((c: any) => ({ ...c, email: e.target.value }))} /></Field>
                <Field label="ที่อยู่" span2>
                  <textarea value={company.address || ""} onChange={(e: any) => setCompany((c: any) => ({ ...c, address: e.target.value }))} className={cls + " resize-none h-20"} />
                </Field>
              </div>
              <SaveBtn onClick={saveCompany} loading={loading} />
            </div>
            {/* Right — ข้อมูลเพิ่มเติม */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-black text-slate-800 mb-5">ข้อมูลเพิ่มเติม</h3>
              <div className="space-y-4">
                <Field label="เว็บไซต์"><Input value={company.website || ""} onChange={(e: any) => setCompany((c: any) => ({ ...c, website: e.target.value }))} placeholder="https://example.com" /></Field>
                <Field label="โลโก้ URL"><Input value={company.logo_url || ""} onChange={(e: any) => setCompany((c: any) => ({ ...c, logo_url: e.target.value }))} placeholder="https://..." /></Field>
                {company.logo_url && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <img src={company.logo_url} alt="logo" className="w-16 h-16 object-contain" onError={(e:any) => e.target.style.display="none"} />
                    <div><p className="text-xs font-semibold text-slate-600">โลโก้ปัจจุบัน</p><p className="text-xs text-slate-400">แสดงใน header และเอกสาร</p></div>
                  </div>
                )}
              </div>
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
                <p className="text-xs font-bold text-indigo-700 mb-1">Company ID</p>
                <p className="text-xs font-mono text-indigo-500 break-all">{company.id}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1 — สาขา */}
        {tab === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{branches.length} สาขา</p>
              <button onClick={() => openModal("branch")} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
                <Plus size={14} /> เพิ่มสาขา
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {branches.map(b => (
                <div key={b.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0"><MapPin size={16} className="text-indigo-600" /></div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{b.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{b.code}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${b.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>{b.is_active ? "เปิด" : "ปิด"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openModal("branch", b)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil size={13} className="text-slate-500" /></button>
                      <button onClick={async () => { if (!confirm("ลบสาขานี้?")) return; await supabase.from("branches").delete().eq("id", b.id); toast.success("ลบสำเร็จ"); load() }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-400" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{b.address || "-"}</p>
                  {b.latitude && (
                    <div className="flex items-center gap-1.5 bg-indigo-50 rounded-lg px-2.5 py-1.5">
                      <MapPin size={11} className="text-indigo-400 flex-shrink-0" />
                      <p className="text-xs text-indigo-600 font-mono truncate">{(+b.latitude).toFixed(5)}, {(+b.longitude).toFixed(5)}</p>
                      <span className="ml-auto text-xs font-black text-indigo-700 flex-shrink-0">{b.geo_radius_m}ม.</span>
                    </div>
                  )}
                </div>
              ))}
              {branches.length === 0 && <div className="col-span-3 bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">ยังไม่มีสาขา</div>}
            </div>
          </div>
        )}

        {/* Tab 2 — กะทำงาน */}
        {tab === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{shifts.length} กะ</p>
              <button onClick={() => openModal("shift")} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
                <Plus size={14} /> เพิ่มกะทำงาน
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {shifts.map(s => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0"><Clock size={16} className="text-amber-600" /></div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${s.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>{s.is_active ? "เปิด" : "ปิด"}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openModal("shift", s)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil size={13} className="text-slate-500" /></button>
                      <button onClick={async () => { if (!confirm("ปิดใช้งานกะนี้?")) return; await supabase.from("shift_templates").update({ is_active: false }).eq("id", s.id); toast.success("ปิดแล้ว"); load() }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-400" /></button>
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-xl px-3 py-2.5 text-center">
                    <p className="text-lg font-black text-amber-700">{s.work_start} – {s.work_end}</p>
                    {s.is_overnight && <p className="text-xs text-amber-500">(ข้ามคืน)</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-slate-50 rounded-xl py-2"><p className="text-sm font-black text-slate-700">{s.late_threshold_min ?? 0}</p><p className="text-[10px] text-slate-400">ผ่อนผัน(น.)</p></div>
                    <div className="bg-slate-50 rounded-xl py-2"><p className="text-sm font-black text-slate-700">{s.break_minutes}</p><p className="text-[10px] text-slate-400">พัก(น.)</p></div>
                    <div className="bg-slate-50 rounded-xl py-2"><p className="text-sm font-black text-slate-700">{s.ot_start_after_minutes}</p><p className="text-[10px] text-slate-400">OT หลัง(น.)</p></div>
                  </div>
                </div>
              ))}
              {shifts.length === 0 && <div className="col-span-3 bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">ยังไม่มีกะทำงาน</div>}
            </div>
          </div>
        )}

        {/* Tab 3 — ประเภทการลา */}
        {tab === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{leaveTypes.length} ประเภท</p>
              <button onClick={() => openModal("leave")} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
                <Plus size={14} /> เพิ่มประเภทลา
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {leaveTypes.map(lt => (
                <div key={lt.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (lt.color_hex || "#6366f1") + "20" }}>
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: lt.color_hex || "#6366f1" }} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{lt.name}</p>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{lt.code}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openModal("leave", lt)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil size={12} className="text-slate-500" /></button>
                      <button onClick={async () => { if (!confirm("ปิดใช้งาน?")) return; await supabase.from("leave_types").update({ is_active: false }).eq("id", lt.id); toast.success("ปิดแล้ว"); load() }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={12} className="text-red-400" /></button>
                    </div>
                  </div>
                  <div className="text-center rounded-xl py-3" style={{ backgroundColor: (lt.color_hex || "#6366f1") + "10" }}>
                    <p className="text-3xl font-black" style={{ color: lt.color_hex || "#6366f1" }}>{lt.days_per_year ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-0.5">วัน / ปี</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${lt.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>{lt.is_active ? "เปิด" : "ปิด"}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">{lt.is_paid ? "มีเงินเดือน" : "ไม่มีเงินเดือน"}</span>
                    {lt.carry_over && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-semibold">สะสมข้ามปี</span>}
                    {lt.require_document && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-semibold">ต้องใช้เอกสาร</span>}
                  </div>
                </div>
              ))}
              {leaveTypes.length === 0 && <div className="col-span-4 bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">ยังไม่มีประเภทการลา</div>}
            </div>
          </div>
        )}
      </div>
    </>
  )
}