"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Save, Loader2, Plus, Trash2, MapPin, X, Pencil } from "lucide-react"
import toast from "react-hot-toast"

// Singleton
const supabase = createClient()

const DEFAULT_LEAVE_TYPES = [
  { code: "SICK",      name: "ลาป่วย",              days_per_year: 30,  is_paid: true,  carry_over: false, require_document: true,  color_hex: "#ef4444", note: "ลาได้เท่าที่ป่วยจริง ไม่เกิน 30 วันทำงาน/ปี (ลา ≥ 3 วัน ต้องมีใบรับรองแพทย์)" },
  { code: "PERSONAL",  name: "ลากิจ",               days_per_year: 3,   is_paid: true,  carry_over: false, require_document: false, color_hex: "#f59e0b", note: "ลาได้ไม่น้อยกว่า 3 วันทำงาน/ปี ได้รับค่าจ้าง" },
  { code: "ANNUAL",    name: "ลาพักร้อน",           days_per_year: 6,   is_paid: true,  carry_over: false, require_document: false, color_hex: "#3b82f6", note: "ลูกจ้างทำงานครบ 1 ปี มีสิทธิ์ลาไม่น้อยกว่า 6 วันทำงาน/ปี" },
  { code: "MATERNITY", name: "ลาคลอดบุตร",         days_per_year: 120, is_paid: true,  carry_over: false, require_document: true,  color_hex: "#ec4899", note: "ลาได้ไม่เกิน 120 วัน/ครรภ์ (มีผล ธ.ค. 68) นายจ้างจ่าย 45 วัน + ประกันสังคม" },
  { code: "STERILIZE", name: "ลาทำหมัน",           days_per_year: 0,   is_paid: true,  carry_over: false, require_document: true,  color_hex: "#8b5cf6", note: "ลาตามระยะเวลาที่แพทย์กำหนดและออกใบรับรอง" },
  { code: "MILITARY",  name: "ลารับราชการทหาร",    days_per_year: 60,  is_paid: true,  carry_over: false, require_document: true,  color_hex: "#64748b", note: "ลาตามระยะเวลาที่เรียกพล รับค่าจ้างไม่เกิน 60 วัน" },
  { code: "TRAINING",  name: "ลาเพื่อฝึกอบรม",    days_per_year: 0,   is_paid: false, carry_over: false, require_document: true,  color_hex: "#06b6d4", note: "ลาตามหลักเกณฑ์ที่กำหนด (ไม่ได้รับค่าจ้าง เว้นแต่ตกลงกัน)" },
]

const EMPTY_FORM = {
  code: "", name: "", days_per_year: 0, is_paid: true,
  carry_over: false, require_document: false, color_hex: "#3b82f6", note: "",
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState(0)
  const [company, setCompany] = useState<any>({})
  const [leaveTypes, setLeaveTypes] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(EMPTY_FORM)
  const [importLoading, setImportLoading] = useState(false)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  // company_id จาก user
  const companyId = user?.employee?.company_id

  const loadLeaveTypes = async (cid: string) => {
    const { data, error } = await supabase
      .from("leave_types")
      .select("*")
      .eq("company_id", cid)
      .order("created_at", { ascending: true })
    if (error) {
      console.error("loadLeaveTypes error:", error)
      toast.error("โหลดประเภทการลาไม่ได้: " + error.message)
    }
    setLeaveTypes(data ?? [])
  }

  useEffect(() => {
    if (!companyId) return
    supabase.from("companies").select("*").eq("id", companyId).single()
      .then(({ data }) => setCompany(data ?? {}))
    loadLeaveTypes(companyId)
    supabase.from("branches").select("*").eq("company_id", companyId).eq("is_active", true)
      .then(({ data }) => setBranches(data ?? []))
    supabase.from("shift_templates").select("*").eq("company_id", companyId).eq("is_active", true)
      .then(({ data }) => setShifts(data ?? []))
  }, [companyId])

  const saveCompany = async () => {
    setSaving(true)
    const { error } = await supabase.from("companies")
      .update({ name_th: company.name_th, name_en: company.name_en, phone: company.phone, email: company.email, address: company.address })
      .eq("id", company.id)
    if (error) toast.error("เกิดข้อผิดพลาด: " + error.message)
    else toast.success("บันทึกสำเร็จ")
    setSaving(false)
  }

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (lt: any) => {
    setEditId(lt.id)
    setForm({ code: lt.code, name: lt.name, days_per_year: lt.days_per_year ?? 0, is_paid: lt.is_paid, carry_over: lt.carry_over, require_document: lt.require_document, color_hex: lt.color_hex ?? "#3b82f6", note: lt.note ?? "" })
    setShowForm(true)
  }

  const saveLeaveType = async () => {
    if (!form.code || !form.name) return toast.error("กรุณากรอกรหัสและชื่อ")
    if (!companyId) return toast.error("ไม่พบ company_id")
    setSaving(true)
    const payload = {
      code: form.code, name: form.name,
      days_per_year: Number(form.days_per_year),
      is_paid: form.is_paid, carry_over: form.carry_over,
      require_document: form.require_document,
      color_hex: form.color_hex, note: form.note,
      company_id: companyId, is_active: true,
    }
    const { error } = editId
      ? await supabase.from("leave_types").update(payload).eq("id", editId)
      : await supabase.from("leave_types").insert(payload)

    if (error) toast.error(error.message)
    else { toast.success(editId ? "แก้ไขสำเร็จ" : "เพิ่มสำเร็จ"); setShowForm(false); loadLeaveTypes(companyId) }
    setSaving(false)
  }

  const deleteLeaveType = async (id: string) => {
    if (!confirm("ลบประเภทการลานี้?")) return
    await supabase.from("leave_types").update({ is_active: false }).eq("id", id)
    toast.success("ลบแล้ว")
    if (companyId) loadLeaveTypes(companyId)
  }

  const importDefaults = async () => {
    if (!companyId) {
      toast.error("ไม่พบ company_id — กรุณารอให้โหลดข้อมูลเสร็จก่อน")
      return
    }
    if (!confirm("นำเข้าประเภทการลาตามกฎหมายแรงงานไทย?")) return
    setImportLoading(true)
    let added = 0, skipped = 0

    for (const lt of DEFAULT_LEAVE_TYPES) {
      const exists = leaveTypes.find((x) => x.code === lt.code)
      if (exists) { skipped++; continue }
      const { error } = await supabase.from("leave_types").insert({
        ...lt, company_id: companyId, is_active: true,
      })
      if (error) {
        console.error("insert error:", lt.code, error)
        toast.error(`เพิ่ม ${lt.name} ไม่ได้: ${error.message}`)
      } else {
        added++
      }
    }

    toast.success(`นำเข้าสำเร็จ ${added} รายการ${skipped > 0 ? ` (ข้าม ${skipped} รายการที่มีแล้ว)` : ""}`)
    await loadLeaveTypes(companyId)
    setImportLoading(false)
  }

  const TABS = ["บริษัท", "ประเภทการลา", "สาขา", "กะทำงาน"]

  // แสดง loading ถ้า auth ยังไม่เสร็จ
  if (authLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
  }

  // แสดง warning ถ้าไม่มี company
  if (!companyId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 max-w-md">
          <p className="text-yellow-800 font-semibold mb-1">ไม่พบข้อมูลบริษัท</p>
          <p className="text-yellow-700 text-sm">กรุณาตรวจสอบว่า user ของคุณมี employee และ company_id ใน Supabase</p>
          <p className="text-yellow-600 text-xs mt-2 font-mono">users → employee_id → employees → company_id</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบ</h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={"px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap " +
              (tab === i ? "bg-primary-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm max-w-2xl">

        {/* TAB 0: บริษัท */}
        {tab === 0 && (
          <>
            <h3 className="font-bold text-slate-800 mb-4">ข้อมูลบริษัท</h3>
            <div className="space-y-4">
              {[["name_th", "ชื่อบริษัท (ไทย)*"], ["name_en", "ชื่อบริษัท (EN)"], ["phone", "เบอร์โทร"], ["email", "อีเมล"]].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{l}</label>
                  <input value={company[k] || ""} onChange={e => setCompany((c: any) => ({ ...c, [k]: e.target.value }))} className="input-field" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ที่อยู่</label>
                <textarea value={company.address || ""} onChange={e => setCompany((c: any) => ({ ...c, address: e.target.value }))} className="input-field h-20 resize-none" />
              </div>
            </div>
            <button onClick={saveCompany} disabled={saving} className="btn-primary mt-4 flex items-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              <Save size={14} /> บันทึก
            </button>
          </>
        )}

        {/* TAB 1: ประเภทการลา */}
        {tab === 1 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">ประเภทการลา</h3>
              <div className="flex gap-2">
                <button onClick={importDefaults} disabled={importLoading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50">
                  {importLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  นำเข้าตามกฎหมาย
                </button>
                <button onClick={openAdd}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700">
                  <Plus size={12} /> เพิ่มใหม่
                </button>
              </div>
            </div>

            {/* แสดง company_id เพื่อ debug */}
            <p className="text-xs text-slate-400 mb-3 font-mono">company_id: {companyId}</p>

            {/* Form เพิ่ม/แก้ไข */}
            {showForm && (
              <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-slate-800 text-sm">{editId ? "แก้ไขประเภทการลา" : "เพิ่มประเภทการลาใหม่"}</p>
                  <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-200 rounded-lg"><X size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">รหัส *</label>
                    <input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} className="input-field py-2 text-sm" placeholder="SICK" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">ชื่อ *</label>
                    <input value={form.name} onChange={e => set("name", e.target.value)} className="input-field py-2 text-sm" placeholder="ลาป่วย" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">วัน/ปี (0 = ไม่จำกัด)</label>
                    <input type="number" min={0} value={form.days_per_year} onChange={e => set("days_per_year", e.target.value)} className="input-field py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">สี</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.color_hex} onChange={e => set("color_hex", e.target.value)} className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer" />
                      <input value={form.color_hex} onChange={e => set("color_hex", e.target.value)} className="input-field py-2 text-sm flex-1" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mb-3 text-sm">
                  {[["is_paid", "ได้รับค่าจ้าง"], ["carry_over", "พักยอดข้ามปี"], ["require_document", "ต้องมีเอกสาร"]].map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                      <span className="text-slate-700">{l}</span>
                    </label>
                  ))}
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">หมายเหตุ</label>
                  <textarea value={form.note} onChange={e => set("note", e.target.value)} className="input-field py-2 text-sm h-16 resize-none" />
                </div>
                <button onClick={saveLeaveType} disabled={saving} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  <Save size={12} /> {editId ? "บันทึกการแก้ไข" : "เพิ่มประเภทการลา"}
                </button>
              </div>
            )}

            {/* รายการ */}
            <div className="space-y-2">
              {leaveTypes.filter(lt => lt.is_active !== false).map(lt => (
                <div key={lt.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl group">
                  <div className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: lt.color_hex || "#60a5fa" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{lt.name}</p>
                      <span className="text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">{lt.code}</span>
                      {lt.is_paid
                        ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">ได้รับค่าจ้าง</span>
                        : <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">ไม่ได้รับค่าจ้าง</span>}
                      {lt.require_document && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">ต้องมีเอกสาร</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lt.days_per_year > 0 ? `${lt.days_per_year} วัน/ปี` : "ไม่จำกัดวัน"}
                      {lt.carry_over ? " · พักยอดข้ามปีได้" : ""}
                    </p>
                    {lt.note && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{lt.note}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(lt)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-primary-50">
                      <Pencil size={12} className="text-slate-500" />
                    </button>
                    <button onClick={() => deleteLeaveType(lt.id)} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50">
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
              {leaveTypes.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm mb-3">ยังไม่มีประเภทการลา</p>
                  <button onClick={importDefaults} disabled={importLoading} className="text-xs text-primary-600 font-semibold hover:underline">
                    {importLoading ? "กำลังนำเข้า..." : "คลิกนำเข้าตามกฎหมายแรงงานไทย →"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: สาขา */}
        {tab === 2 && (
          <>
            <h3 className="font-bold text-slate-800 mb-4">สาขา / ที่ตั้ง</h3>
            <div className="space-y-3">
              {branches.map(b => (
                <div key={b.id} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} className="text-primary-500" />
                    <p className="font-medium text-slate-800 text-sm">{b.name}</p>
                    <span className="text-xs text-slate-400">({b.code})</span>
                  </div>
                  {b.latitude && <p className="text-xs text-slate-400 font-mono">{b.latitude}, {b.longitude} · รัศมี {b.geo_radius_m}m</p>}
                </div>
              ))}
              {branches.length === 0 && <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีสาขา</p>}
            </div>
          </>
        )}

        {/* TAB 3: กะทำงาน */}
        {tab === 3 && (
          <>
            <h3 className="font-bold text-slate-800 mb-4">กะทำงาน</h3>
            <div className="space-y-3">
              {shifts.map(s => (
                <div key={s.id} className="p-3 bg-slate-50 rounded-xl">
                  <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.work_start} - {s.work_end} {s.is_overnight ? "(ข้ามคืน)" : ""}</p>
                </div>
              ))}
              {shifts.length === 0 && <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีกะทำงาน</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}