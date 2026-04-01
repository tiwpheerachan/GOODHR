"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  ArrowLeft, Plus, Trash2, Save, Loader2, CheckCircle2, XCircle,
  AlertTriangle, ClipboardPaste, RotateCcw, Info, Copy, ClipboardCopy
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

// ─── Types ────────────────────────────────────────────────────────
type ColType = "text" | "select" | "date" | "number" | "national_id"
type ColDef = {
  key: string; label: string; required?: boolean
  type: ColType; width: number
  options?: Opt[]
  optionsKey?: "companies" | "depts" | "positions" | "branches"
  hint?: string
}
type Opt = { v: string; l: string }
type RowData = Record<string, string>

// ─── Static options ───────────────────────────────────────────────
const EMPTY_OPT: Opt[] = [{ v: "", l: "—" }]
const GENDER_OPTS: Opt[]     = [...EMPTY_OPT, { v:"male",l:"ชาย" }, { v:"female",l:"หญิง" }, { v:"other",l:"อื่นๆ" }]
const EMP_TYPE_OPTS: Opt[]   = [{ v:"full_time",l:"ประจำ" }, { v:"part_time",l:"พาร์ทไทม์" }, { v:"contract",l:"สัญญา" }, { v:"intern",l:"ฝึกงาน" }]
const EMP_STATUS_OPTS: Opt[] = [{ v:"probation",l:"ทดลองงาน" }, { v:"active",l:"ปกติ" }]

// ─── Columns (บริษัทเป็น col แรก) ────────────────────────────────
const COLS: ColDef[] = [
  { key:"company_id",        label:"บริษัท",           required:true,  type:"select",      width:160, optionsKey:"companies" },
  { key:"employee_code",     label:"รหัสพนักงาน",       required:true,  type:"text",        width:120 },
  { key:"first_name_th",     label:"ชื่อ (ไทย)",        required:true,  type:"text",        width:110 },
  { key:"last_name_th",      label:"นามสกุล (ไทย)",     required:true,  type:"text",        width:130 },
  { key:"first_name_en",     label:"ชื่อ (EN)",         required:false, type:"text",        width:100 },
  { key:"last_name_en",      label:"นามสกุล (EN)",      required:false, type:"text",        width:110 },
  { key:"nickname",          label:"ชื่อเล่น",          required:false, type:"text",        width:90  },
  { key:"email",             label:"อีเมล",             required:true,  type:"text",        width:180 },
  { key:"phone",             label:"เบอร์โทร",          required:false, type:"text",        width:110 },
  { key:"gender",            label:"เพศ",               required:false, type:"select",      width:90,  options:GENDER_OPTS },
  { key:"birth_date",        label:"วันเกิด",           required:false, type:"date",        width:130 },
  { key:"national_id",       label:"เลขบัตรประชาชน",   required:false, type:"national_id", width:140, hint:"13 หลัก" },
  { key:"social_security_no",label:"เลขประกันสังคม",   required:false, type:"text",        width:130 },
  { key:"bank_account",      label:"เลขบัญชีธนาคาร",   required:false, type:"text",        width:140 },
  { key:"bank_name",         label:"ธนาคาร",            required:false, type:"text",        width:110 },
  { key:"department_id",     label:"แผนก",              required:false, type:"select",      width:145, optionsKey:"depts" },
  { key:"position_id",       label:"ตำแหน่ง",          required:false, type:"select",      width:155, optionsKey:"positions" },
  { key:"branch_id",         label:"สาขา",             required:false, type:"select",      width:130, optionsKey:"branches" },
  { key:"employment_type",   label:"ประเภทการจ้าง",    required:false, type:"select",      width:120, options:EMP_TYPE_OPTS },
  { key:"employment_status", label:"สถานะ",             required:false, type:"select",      width:110, options:EMP_STATUS_OPTS },
  { key:"hire_date",         label:"วันเริ่มงาน",       required:true,  type:"date",        width:130 },
  { key:"probation_end_date",label:"สิ้นสุดทดลองงาน",  required:false, type:"date",        width:140 },
  { key:"base_salary",       label:"เงินเดือน (฿)",    required:false, type:"number",      width:120 },
  { key:"allowance_position",label:"เบี้ยตำแหน่ง",     required:false, type:"number",      width:110 },
  { key:"allowance_transport",label:"ค่าเดินทาง",       required:false, type:"number",      width:100 },
  { key:"allowance_food",    label:"ค่าอาหาร",          required:false, type:"number",      width:90  },
  { key:"allowance_phone",   label:"ค่าโทรศัพท์",       required:false, type:"number",      width:100 },
  { key:"allowance_housing", label:"ค่าที่พัก",         required:false, type:"number",      width:100 },
  { key:"address",           label:"ที่อยู่",           required:false, type:"text",        width:200 },
]

// ─── helpers ──────────────────────────────────────────────────────
function emptyRow(defaultCompanyId = ""): RowData {
  const r: RowData = {}
  COLS.forEach(c => {
    if      (c.key === "company_id")         r[c.key] = defaultCompanyId
    else if (c.key === "employment_type")    r[c.key] = "full_time"
    else if (c.key === "employment_status")  r[c.key] = "probation"
    else r[c.key] = ""
  })
  return r
}

function validateRow(row: RowData, allEmails: string[], allCodes: string[]): Record<string,string> {
  const e: Record<string,string> = {}
  if (!row.company_id)           e.company_id     = "จำเป็น"
  if (!row.employee_code?.trim()) e.employee_code = "จำเป็น"
  else if (allCodes.filter(c => c === row.employee_code.trim()).length > 1) e.employee_code = "ซ้ำ"
  if (!row.first_name_th?.trim()) e.first_name_th = "จำเป็น"
  if (!row.last_name_th?.trim())  e.last_name_th  = "จำเป็น"
  if (!row.email?.trim())         e.email         = "จำเป็น"
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) e.email = "ผิดรูปแบบ"
  else if (allEmails.filter(x => x === row.email.toLowerCase().trim()).length > 1) e.email = "ซ้ำ"
  if (!row.hire_date?.trim())     e.hire_date     = "จำเป็น"
  if (row.national_id && row.national_id.replace(/\D/g,"").length !== 13) e.national_id = "ต้อง 13 หลัก"
  return e
}

// ─── Page ─────────────────────────────────────────────────────────
export default function BulkAddPage() {
  const { user } = useAuth()
  const supabase = createClient()

  // company options + per-company data cache
  const [companyOpts, setCompanyOpts]  = useState<Opt[]>([{ v:"", l:"— เลือกบริษัท —" }])
  const [companyCache, setCompanyCache] = useState<Record<string,{
    depts: Opt[]; positions: Opt[]; branches: Opt[]
  }>>({})
  const loadingRef = useRef<Set<string>>(new Set())

  const [rows,       setRows]       = useState<RowData[]>(() => Array.from({ length: 5 }, () => emptyRow()))
  const [errors,     setErrors]     = useState<Record<number, Record<string,string>>>({})
  const [activeCell, setActiveCell] = useState<{ r:number; c:number } | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [results,    setResults]    = useState<any[] | null>(null)

  const myCompanyId = user?.employee?.company_id ?? (user as any)?.company_id

  // โหลดรายชื่อบริษัท
  useEffect(() => {
    supabase.from("companies").select("id,name_th,code").eq("is_active",true).order("name_th")
      .then(({ data }) => {
        const opts: Opt[] = [
          { v:"", l:"— เลือกบริษัท —" },
          ...(data ?? []).map((c:any) => ({ v:c.id, l:`[${c.code}] ${c.name_th}` }))
        ]
        setCompanyOpts(opts)
        // default company สำหรับ row แรก
        const def = myCompanyId || data?.[0]?.id || ""
        if (def) setRows(prev => prev.map(r => ({ ...r, company_id: r.company_id || def })))
      })
  }, [myCompanyId]) // eslint-disable-line

  // โหลด dept/position/branch ของบริษัทที่ยังไม่เคยโหลด
  const loadCompanyData = useCallback(async (cid: string) => {
    if (!cid || companyCache[cid] || loadingRef.current.has(cid)) return
    loadingRef.current.add(cid)
    const [d, p, b] = await Promise.all([
      supabase.from("departments").select("id,name").eq("company_id",cid).order("name"),
      supabase.from("positions").select("id,name").eq("company_id",cid).order("name"),
      supabase.from("branches").select("id,name").eq("company_id",cid).order("name"),
    ])
    setCompanyCache(prev => ({
      ...prev,
      [cid]: {
        depts:     [{ v:"",l:"—" }, ...(d.data??[]).map((x:any)=>({ v:x.id, l:x.name }))],
        positions: [{ v:"",l:"—" }, ...(p.data??[]).map((x:any)=>({ v:x.id, l:x.name }))],
        branches:  [{ v:"",l:"—" }, ...(b.data??[]).map((x:any)=>({ v:x.id, l:x.name }))],
      }
    }))
  }, [companyCache]) // eslint-disable-line

  // เมื่อ rows มีบริษัทใหม่ → โหลดข้อมูลของบริษัทนั้น
  useEffect(() => {
    const uniqueCids = Array.from(new Set(rows.map(r => r.company_id).filter(Boolean)))
    uniqueCids.forEach(cid => loadCompanyData(cid))
  }, [rows, loadCompanyData])

  // options ตาม col + row (company-aware)
  const getOpts = useCallback((col: ColDef, row: RowData): Opt[] => {
    if (col.options)                    return col.options
    if (col.optionsKey === "companies") return companyOpts
    const cd = companyCache[row.company_id]
    if (!cd) return [{ v:"", l:"— เลือกบริษัทก่อน —" }]
    if (col.optionsKey === "depts")     return cd.depts
    if (col.optionsKey === "positions") return cd.positions
    if (col.optionsKey === "branches")  return cd.branches
    return EMPTY_OPT
  }, [companyOpts, companyCache])

  // ─── row operations ──────────────────────────────────────────
  const setCell = (ri: number, key: string, val: string) => {
    setRows(prev => { const n=[...prev]; n[ri]={...n[ri],[key]:val}; return n })
    setErrors(prev => {
      const re = { ...(prev[ri]||{}) }; delete re[key]
      return { ...prev, [ri]: re }
    })
  }

  const addRow = () => {
    const lastCid = rows[rows.length-1]?.company_id || ""
    setRows(prev => [...prev, emptyRow(lastCid)])
  }

  const deleteRow = (i: number) => {
    setRows(prev => prev.filter((_,idx)=>idx!==i))
    setErrors(prev => {
      const n: typeof prev = {}
      Object.entries(prev).forEach(([k,v]) => {
        const ki = parseInt(k)
        if (ki !== i) n[ki > i ? ki-1 : ki] = v
      })
      return n
    })
  }

  const copyRow = (i: number) => {
    const copy = { ...rows[i] }
    setRows(prev => { const n=[...prev]; n.splice(i+1,0,copy); return n })
    toast.success("ก๊อปแถวแล้ว")
  }

  const clearAll = () => { setRows(Array.from({ length:5 }, ()=>emptyRow())); setErrors({}); setResults(null) }

  // ─── Copy table as TSV to clipboard ──────────────────────────
  const copyTableToClipboard = () => {
    const header = COLS.map(c => c.label).join("\t")
    const body = rows.map(row =>
      COLS.map(col => {
        const v = row[col.key] || ""
        // map IDs/values back to labels for readability
        const opts = getOpts(col, row)
        const found = opts.find(o => o.v === v)
        return found && found.v ? found.l : v
      }).join("\t")
    ).join("\n")
    navigator.clipboard.writeText(header + "\n" + body)
      .then(() => toast.success("คัดลอกตารางแล้ว"))
  }

  // ─── Paste (TSV from Google Sheets / Excel) ──────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent, startRow: number, startCol: number) => {
    const text = e.clipboardData.getData("text/plain")
    if (!text.includes("\t") && !text.includes("\n")) return
    e.preventDefault()

    const tsvRows = text.trim().split(/\r?\n/).map(r => r.split("\t").map(c => c.trim()))

    setRows(prev => {
      const next = [...prev]
      const needed = startRow + tsvRows.length
      const lastCid = next[next.length-1]?.company_id || ""
      while (next.length < needed) next.push(emptyRow(lastCid))

      tsvRows.forEach((tsvRow, ri) => {
        const rowIdx = startRow + ri
        const newRow = { ...next[rowIdx] }

        tsvRow.forEach((val, ci) => {
          const colIdx = startCol + ci
          if (colIdx >= COLS.length) return
          const col = COLS[colIdx]
          let mapped = val

          if (col.type === "select") {
            // หา match จาก label หรือ value
            const opts = col.options || (col.optionsKey === "companies" ? companyOpts : EMPTY_OPT)
            const found = opts.find(o =>
              o.l.toLowerCase() === val.toLowerCase() ||
              o.v.toLowerCase() === val.toLowerCase()
            )
            mapped = found ? found.v : val
          }
          if (col.key === "national_id") mapped = val.replace(/\D/g,"").slice(0,13)
          newRow[col.key] = mapped
        })
        next[rowIdx] = newRow
      })
      return next
    })

    toast.success(`วาง ${tsvRows.length} แถว`, { duration: 1500 })
  }, [companyOpts])

  // ─── Validate + Submit ────────────────────────────────────────
  const handleSubmit = async () => {
    const filled = rows.filter(r => r.employee_code?.trim() || r.first_name_th?.trim())
    if (filled.length === 0) { toast.error("ไม่มีข้อมูลที่จะบันทึก"); return }

    const allEmails = filled.map(r => r.email?.toLowerCase().trim() || "")
    const allCodes  = filled.map(r => r.employee_code?.trim() || "")

    const newErrors: Record<number, Record<string,string>> = {}
    rows.forEach((row, i) => {
      if (!row.employee_code?.trim() && !row.first_name_th?.trim()) return
      const errs = validateRow(row, allEmails, allCodes)
      if (Object.keys(errs).length > 0) newErrors[i] = errs
    })

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast.error(`มีข้อผิดพลาด ${Object.keys(newErrors).length} แถว`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: filled }),  // company_id อยู่ใน row แล้ว
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.results || [])
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  // ─── Render cell ──────────────────────────────────────────────
  const renderCell = (row: RowData, ri: number, col: ColDef, ci: number) => {
    const val = row[col.key] || ""
    const err = errors[ri]?.[col.key]
    const isActive = activeCell?.r === ri && activeCell?.c === ci
    const onFocus  = () => setActiveCell({ r:ri, c:ci })
    const base = `h-8 w-full px-2 text-xs outline-none border-0 bg-transparent ${err ? "text-red-600" : "text-slate-800"} ${isActive ? "ring-2 ring-inset ring-indigo-400" : ""}`

    if (col.type === "select") {
      const opts = getOpts(col, row)
      return (
        <select value={val} onFocus={onFocus}
          onChange={e => {
            setCell(ri, col.key, e.target.value)
            // เมื่อเปลี่ยนบริษัท → reset dept/pos/branch
            if (col.key === "company_id") {
              setCell(ri, "department_id", "")
              setCell(ri, "position_id",   "")
              setCell(ri, "branch_id",     "")
            }
          }}
          className={base + " cursor-pointer"} style={{ width: col.width - 2 }}>
          {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      )
    }

    if (col.type === "date") {
      return <input type="date" value={val} onFocus={onFocus}
        onChange={e => setCell(ri, col.key, e.target.value)}
        onPaste={e => handlePaste(e, ri, ci)}
        className={base} style={{ width: col.width - 2 }} />
    }

    if (col.type === "number") {
      return <input type="number" value={val} onFocus={onFocus}
        onChange={e => setCell(ri, col.key, e.target.value)}
        onPaste={e => handlePaste(e, ri, ci)}
        placeholder="0" className={base + " placeholder-slate-300"} style={{ width: col.width - 2 }} />
    }

    if (col.type === "national_id") {
      return <input type="text" value={val} onFocus={onFocus}
        onChange={e => setCell(ri, col.key, e.target.value.replace(/\D/g,"").slice(0,13))}
        onPaste={e => handlePaste(e, ri, ci)}
        placeholder="1234567890123" maxLength={13}
        className={base + " font-mono placeholder-slate-300"} style={{ width: col.width - 2 }} />
    }

    return <input type="text" value={val} onFocus={onFocus}
      onChange={e => setCell(ri, col.key, e.target.value)}
      onPaste={e => handlePaste(e, ri, ci)}
      placeholder={col.required ? col.label : ""}
      className={base + " placeholder-slate-200"} style={{ width: col.width - 2 }} />
  }

  // ─── Results page ─────────────────────────────────────────────
  if (results) {
    const ok   = results.filter(r => r.success)
    const fail = results.filter(r => !r.success)
    return (
      <div className="max-w-2xl mx-auto space-y-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/employees" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft size={18}/></Link>
          <h2 className="text-xl font-black text-slate-800">ผลการเพิ่มพนักงาน</h2>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1"/>
            <p className="text-3xl font-black text-emerald-700">{ok.length}</p>
            <p className="text-xs text-emerald-600">สำเร็จ</p>
          </div>
          <div className={`flex-1 rounded-2xl border p-4 text-center ${fail.length>0?"bg-red-50 border-red-200":"bg-slate-50 border-slate-100"}`}>
            <XCircle size={24} className={`mx-auto mb-1 ${fail.length>0?"text-red-500":"text-slate-200"}`}/>
            <p className={`text-3xl font-black ${fail.length>0?"text-red-600":"text-slate-200"}`}>{fail.length}</p>
            <p className={`text-xs ${fail.length>0?"text-red-500":"text-slate-300"}`}>ล้มเหลว</p>
          </div>
        </div>

        {ok.some(r=>r.generated_password) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-3">
              <AlertTriangle size={12}/> รหัสผ่านที่สร้างอัตโนมัติ — บันทึกก่อนปิดหน้านี้
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {ok.filter(r=>r.generated_password).map((r,i)=>(
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="flex-1 text-slate-700 font-medium">{r.name}</span>
                  <span className="font-mono bg-white border border-amber-200 px-2 py-0.5 rounded-lg text-slate-700">{r.generated_password}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {fail.length > 0 && (
          <div className="border border-red-200 rounded-2xl overflow-hidden">
            <div className="bg-red-50 px-4 py-2.5 border-b border-red-100"><p className="text-xs font-bold text-red-700">แถวที่ล้มเหลว</p></div>
            {fail.map((r,i)=>(
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 text-xs">
                <XCircle size={13} className="text-red-400 flex-shrink-0"/>
                <span className="font-medium text-slate-700">{r.name}</span>
                <span className="text-red-500 flex-1 text-right">{r.error}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {fail.length > 0 && (
            <button onClick={() => setResults(null)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border-2 border-dashed border-red-200 text-red-600 hover:bg-red-50 transition-all">
              <RotateCcw size={13}/> กลับแก้ไข
            </button>
          )}
          <Link href="/admin/employees"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all">
            ดูรายชื่อพนักงาน
          </Link>
        </div>
      </div>
    )
  }

  // ─── Main grid ────────────────────────────────────────────────
  const filledCount = rows.filter(r => r.employee_code?.trim() || r.first_name_th?.trim()).length
  const errCount    = Object.keys(errors).length
  const totalColWidth = COLS.reduce((s,c)=>s+c.width, 0) + 36 + 56 // row# + actions

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/employees" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft size={18}/></Link>
          <div>
            <h2 className="text-xl font-black text-slate-800">เพิ่มพนักงานหลายคน</h2>
            <p className="text-slate-400 text-xs mt-0.5">กรอกตรงนี้หรือก๊อปจาก Google Sheets แล้ววางที่เซลล์แรก · หลายบริษัทในตารางเดียวได้</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={copyTableToClipboard}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors">
            <ClipboardCopy size={12}/> ก๊อปตาราง
          </button>
          <button onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors">
            <RotateCcw size={12}/> ล้างทั้งหมด
          </button>
        </div>
      </div>

      {/* Paste hint */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
        <ClipboardPaste size={13} className="text-indigo-500 flex-shrink-0"/>
        <p className="text-xs text-indigo-700">
          <strong>วิธีวาง:</strong> คัดลอกจาก Google Sheets → คลิกที่เซลล์ใดก็ได้ → Ctrl+V — ข้อมูลกระจายจากตำแหน่งนั้นอัตโนมัติ
          &nbsp;·&nbsp; Dropdown บริษัท/แผนก/ตำแหน่งจะ match ชื่อให้เองเมื่อ paste
        </p>
      </div>

      {/* Status bar */}
      {(filledCount > 0 || errCount > 0) && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">{filledCount} แถวที่มีข้อมูล</span>
          {errCount > 0 && (
            <span className="text-xs font-bold text-red-600 flex items-center gap-1">
              <AlertTriangle size={11}/> {errCount} แถวมีข้อผิดพลาด
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: totalColWidth }}>
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                {/* # */}
                <th className="w-9 text-center text-[10px] font-bold text-slate-400 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 py-2.5">#</th>
                {COLS.map(col => (
                  <th key={col.key} style={{ width:col.width, minWidth:col.width }}
                    className="px-2 py-2.5 text-left text-[11px] font-bold whitespace-nowrap border-r border-slate-200 last:border-r-0 text-slate-600">
                    {col.label}
                    {col.required && <span className="text-red-500 ml-0.5">*</span>}
                    {col.hint && <span className="ml-1 text-[9px] text-slate-400">({col.hint})</span>}
                  </th>
                ))}
                {/* actions header */}
                <th className="w-14 sticky right-0 bg-slate-50 z-10 border-l border-slate-200"/>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const rowErrs = errors[ri] || {}
                const hasErr  = Object.keys(rowErrs).length > 0
                const isEmpty = !row.employee_code?.trim() && !row.first_name_th?.trim()
                return (
                  <tr key={ri} className={`border-b border-slate-100 last:border-0 group ${
                    hasErr ? "bg-red-50/50" : isEmpty ? "bg-white" : "bg-white hover:bg-blue-50/20"
                  }`}>
                    {/* row number */}
                    <td className="w-9 text-center text-[10px] border-r border-slate-200 sticky left-0 z-10 bg-inherit">
                      {hasErr
                        ? <AlertTriangle size={11} className="mx-auto text-red-400"/>
                        : <span className="text-slate-400">{ri+1}</span>}
                    </td>

                    {/* cells */}
                    {COLS.map((col, ci) => {
                      const cellErr = rowErrs[col.key]
                      return (
                        <td key={col.key} title={cellErr || ""}
                          style={{ width:col.width, minWidth:col.width }}
                          className={`border-r border-slate-100 last:border-r-0 relative ${
                            cellErr ? "bg-red-100/70 ring-1 ring-inset ring-red-300" : ""
                          }`}>
                          {renderCell(row, ri, col, ci)}
                          {cellErr && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400 pointer-events-none"/>}
                        </td>
                      )
                    })}

                    {/* row actions */}
                    <td className="w-14 border-l border-slate-100 sticky right-0 bg-inherit z-10">
                      <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyRow(ri)} title="ก๊อปแถวนี้"
                          className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors">
                          <Copy size={12}/>
                        </button>
                        <button onClick={() => deleteRow(ri)} title="ลบแถวนี้"
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Add row button */}
        <button onClick={addRow}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all border-t border-slate-100">
          <Plus size={13}/> เพิ่มแถว
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Info size={11}/>
          ช่อง * จำเป็น · Dropdown โหลดอัตโนมัติตามบริษัทในแถว · ปุ่ม <Copy size={10} className="inline"/> / <Trash2 size={10} className="inline"/> ปรากฏเมื่อ hover
        </p>
        <button onClick={handleSubmit} disabled={loading || filledCount === 0}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm">
          {loading ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
          บันทึก {filledCount > 0 ? `${filledCount} คน` : ""}
        </button>
      </div>
    </div>
  )
}
