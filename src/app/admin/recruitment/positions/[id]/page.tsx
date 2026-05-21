"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Save, Loader2, Send, Image as ImageIcon, Plus, X } from "lucide-react"
import toast from "react-hot-toast"
import CoverImageUpload from "@/components/training/CoverImageUpload"

type LangText = { th: string; en: string; zh: string }
type LangList = { th: string[]; en: string[]; zh: string[] }
const emptyText: LangText = { th: "", en: "", zh: "" }
const emptyList: LangList = { th: [], en: [], zh: [] }

export default function PositionEditor() {
  const { id } = useParams<{ id: string }>()
  const [pos, setPos] = useState<any>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [activeLang, setActiveLang] = useState<"th" | "en" | "zh">("th")

  useEffect(() => {
    fetch("/api/recruitment/positions").then(r => r.json()).then(d => {
      const found = (d.positions || []).find((x: any) => x.id === id)
      if (found) {
        // normalize JSONB fields
        setPos({
          ...found,
          title: { ...emptyText, ...(found.title || {}) },
          description: { ...emptyText, ...(found.description || {}) },
          responsibilities: { ...emptyList, ...(found.responsibilities || {}) },
          qualifications: { ...emptyList, ...(found.qualifications || {}) },
          benefits: { ...emptyList, ...(found.benefits || {}) },
        })
      }
    })
    // load depts/branches (no company filter — single-company app likely)
    Promise.all([
      fetch("/api/departments").then(r => r.ok ? r.json() : { departments: [] }).catch(() => ({ departments: [] })),
    ]).then(([d]) => setDepartments(d.departments || []))
  }, [id])

  const save = async (overrides?: any) => {
    setSaving(true)
    const t = toast.loading("กำลังบันทึก...")
    try {
      const body = { id, ...pos, ...overrides }
      delete body.department; delete body.branch; delete body.company
      const res = await fetch("/api/recruitment/positions", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success("บันทึกแล้ว", { id: t })
      if (overrides?.status) setPos((p: any) => ({ ...p, status: overrides.status }))
    } catch (e: any) { toast.error(e.message, { id: t }) }
    setSaving(false)
  }

  if (!pos) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-400" /></div>

  const update = (k: string, v: any) => setPos((p: any) => ({ ...p, [k]: v }))
  const setLang = (field: "title" | "description", v: string) =>
    setPos((p: any) => ({ ...p, [field]: { ...p[field], [activeLang]: v } }))

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link href="/admin/recruitment/positions" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> ตำแหน่งทั้งหมด
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-3xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black tracking-wider opacity-80">EDIT POSITION</p>
            <input value={pos.title[activeLang]} onChange={e => setLang("title", e.target.value)}
              placeholder="ชื่อตำแหน่ง"
              className="mt-1 w-full bg-transparent border-b border-white/30 focus:border-white outline-none text-2xl font-black text-white placeholder-white/50" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${pos.status === "open" ? "bg-emerald-400 text-emerald-900" : "bg-white/20"}`}>
              {pos.status === "open" ? "เผยแพร่แล้ว" : pos.status === "draft" ? "ฉบับร่าง" : pos.status}
            </span>
            <a href={`https://careers.shd-technology.co.th/jobs/${pos.slug}`} target="_blank" rel="noreferrer"
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold">ดูตัวอย่าง</a>
            <button onClick={() => save()} disabled={saving}
              className="px-3 py-1.5 bg-amber-300 text-amber-900 hover:bg-amber-200 rounded-lg text-xs font-black inline-flex items-center gap-1">
              <Save size={12} /> บันทึก
            </button>
            {pos.status !== "open" ? (
              <button onClick={() => save({ status: "open", open_date: pos.open_date || new Date().toISOString().slice(0, 10) })}
                className="px-3 py-1.5 bg-white text-purple-700 hover:bg-purple-50 rounded-lg text-xs font-black inline-flex items-center gap-1">
                <Send size={12} /> เผยแพร่
              </button>
            ) : (
              <button onClick={() => save({ status: "closed" })}
                className="px-3 py-1.5 bg-rose-400 text-rose-950 hover:bg-rose-300 rounded-lg text-xs font-black">
                ปิดรับ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Language tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 w-fit">
          {(["th", "en", "zh"] as const).map(l => (
            <button key={l} onClick={() => setActiveLang(l)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${activeLang === l ? "bg-white shadow-sm text-purple-700" : "text-slate-500"}`}>
              {l === "th" ? "🇹🇭 ไทย" : l === "en" ? "🇺🇸 English" : "🇨🇳 中文"}
            </button>
          ))}
        </div>

        <p className="text-xs font-black text-slate-600 mb-2">รายละเอียดงาน ({activeLang.toUpperCase()})</p>
        <textarea value={pos.description[activeLang]} onChange={e => setLang("description", e.target.value)}
          rows={5} placeholder="คำอธิบายงาน..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-purple-400 resize-none" />

        <ArrField label="หน้าที่ความรับผิดชอบ" items={pos.responsibilities[activeLang]}
          onChange={(arr) => update("responsibilities", { ...pos.responsibilities, [activeLang]: arr })} />
        <ArrField label="คุณสมบัติ" items={pos.qualifications[activeLang]}
          onChange={(arr) => update("qualifications", { ...pos.qualifications, [activeLang]: arr })} />
        <ArrField label="สวัสดิการ" items={pos.benefits[activeLang]}
          onChange={(arr) => update("benefits", { ...pos.benefits, [activeLang]: arr })} />
      </div>

      {/* Meta */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-xs font-black text-slate-600 flex items-center gap-1"><ImageIcon size={12} /> ภาพปกตำแหน่ง</p>
        <CoverImageUpload value={pos.cover_image_url}
          onChange={(url) => update("cover_image_url", url)}
          aspectRatio="16:9" label="Cover" height="h-40" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldX label="ประเภทการจ้าง">
            <select value={pos.employment_type} onChange={e => update("employment_type", e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm">
              <option value="full_time">ประจำ</option>
              <option value="part_time">พาร์ทไทม์</option>
              <option value="contract">สัญญา</option>
              <option value="intern">ฝึกงาน</option>
              <option value="freelance">ฟรีแลนซ์</option>
            </select>
          </FieldX>
          <FieldX label="แผนก">
            <select value={pos.department_id || ""} onChange={e => update("department_id", e.target.value || null)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm">
              <option value="">— ไม่ระบุ —</option>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FieldX>
          <FieldX label="เมือง"><input value={pos.location_city || ""} onChange={e => update("location_city", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm" /></FieldX>
          <FieldX label="ประเทศ"><input value={pos.location_country || "TH"} onChange={e => update("location_country", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm" /></FieldX>
          <FieldX label="เงินเดือน ขั้นต่ำ"><input type="number" value={pos.salary_min || ""} onChange={e => update("salary_min", e.target.value ? +e.target.value : null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm" /></FieldX>
          <FieldX label="เงินเดือน สูงสุด"><input type="number" value={pos.salary_max || ""} onChange={e => update("salary_max", e.target.value ? +e.target.value : null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm" /></FieldX>
          <FieldX label="ซ่อนเงินเดือน">
            <label className="inline-flex items-center gap-2 mt-2"><input type="checkbox" checked={!!pos.salary_hidden} onChange={e => update("salary_hidden", e.target.checked)} /> <span className="text-sm">ไม่แสดงเงินเดือนในประกาศ</span></label>
          </FieldX>
          <FieldX label="จำนวนรับ"><input type="number" min={1} value={pos.vacancies || 1} onChange={e => update("vacancies", +e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm" /></FieldX>
          <FieldX label="วันเปิดรับ"><input type="date" value={pos.open_date || ""} onChange={e => update("open_date", e.target.value || null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm" /></FieldX>
          <FieldX label="วันปิดรับ"><input type="date" value={pos.close_date || ""} onChange={e => update("close_date", e.target.value || null)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm" /></FieldX>
        </div>
      </div>
    </div>
  )
}

function FieldX({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="text-xs font-bold text-slate-500 mb-1">{label}</p>{children}</div>
}

function ArrField({ label, items, onChange }: { label: string; items: string[]; onChange: (a: string[]) => void }) {
  const [input, setInput] = useState("")
  const add = () => { if (!input.trim()) return; onChange([...(items || []), input.trim()]); setInput("") }
  return (
    <div className="mt-4">
      <p className="text-xs font-black text-slate-600 mb-2">{label}</p>
      <div className="space-y-1 mb-2">
        {(items || []).map((it, i) => (
          <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-sm">
            <span className="flex-1">{it}</span>
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-rose-500 hover:bg-rose-50 p-1 rounded"><X size={11} /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="พิมพ์แล้ว Enter / กดเพิ่ม"
          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-purple-400" />
        <button onClick={add} className="px-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1">
          <Plus size={11} /> เพิ่ม
        </button>
      </div>
    </div>
  )
}
