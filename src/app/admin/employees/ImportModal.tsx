"use client"
import { useState, useRef, useCallback } from "react"
import * as XLSX from "xlsx"
import {
  X, Download, Upload, CheckCircle2, XCircle, Loader2,
  AlertTriangle, FileSpreadsheet, RotateCcw, ChevronRight, Info
} from "lucide-react"
import toast from "react-hot-toast"

// ─── คอลัมน์ template ───────────────────────────────────────────────
const COLUMNS = [
  { key: "employee_code",      label: "รหัสพนักงาน",            required: true,  example: "68000001" },
  { key: "first_name_th",      label: "ชื่อ (ไทย)",             required: true,  example: "สมชาย" },
  { key: "last_name_th",       label: "นามสกุล (ไทย)",          required: true,  example: "ใจดี" },
  { key: "first_name_en",      label: "ชื่อ (EN)",              required: false, example: "Somchai" },
  { key: "last_name_en",       label: "นามสกุล (EN)",           required: false, example: "Jaidee" },
  { key: "nickname",           label: "ชื่อเล่น",               required: false, example: "ชาย" },
  { key: "email",              label: "อีเมล",                  required: true,  example: "somchai@company.com" },
  { key: "phone",              label: "เบอร์โทร",               required: false, example: "081-234-5678" },
  { key: "gender",             label: "เพศ",                    required: false, example: "ชาย",    note: "ชาย / หญิง / อื่นๆ" },
  { key: "birth_date",         label: "วันเกิด",                required: false, example: "1995-06-15", note: "รูปแบบ YYYY-MM-DD" },
  { key: "national_id",        label: "เลขบัตรประชาชน",         required: false, example: "1234567890123", note: "13 หลัก" },
  { key: "social_security_no", label: "เลขประกันสังคม",         required: false, example: "1234567890" },
  { key: "bank_account",       label: "เลขบัญชีธนาคาร",         required: false, example: "123-4-56789-0" },
  { key: "bank_name",          label: "ธนาคาร",                 required: false, example: "กสิกรไทย" },
  { key: "address",            label: "ที่อยู่",                required: false, example: "123 ถ.สุขุมวิท กทม" },
  { key: "department_name",    label: "แผนก",                   required: false, example: "ฝ่ายขาย",    note: "ชื่อต้องตรงกับในระบบ" },
  { key: "position_name",      label: "ตำแหน่ง",               required: false, example: "Sales Executive", note: "ชื่อต้องตรงกับในระบบ" },
  { key: "branch_name",        label: "สาขา",                  required: false, example: "สำนักงานใหญ่", note: "ชื่อต้องตรงกับในระบบ" },
  { key: "employment_type",    label: "ประเภทการจ้าง",          required: false, example: "ประจำ",     note: "ประจำ / พาร์ทไทม์ / สัญญา / ฝึกงาน" },
  { key: "employment_status",  label: "สถานะ",                  required: false, example: "ทดลองงาน",  note: "ทดลองงาน / ปกติ" },
  { key: "hire_date",          label: "วันเริ่มงาน",            required: true,  example: "2026-01-06", note: "รูปแบบ YYYY-MM-DD" },
  { key: "probation_end_date", label: "วันสิ้นสุดทดลองงาน",    required: false, example: "2026-05-05", note: "รูปแบบ YYYY-MM-DD" },
  { key: "base_salary",        label: "เงินเดือน (บาท)",        required: false, example: "25000" },
  { key: "allowance_position", label: "เบี้ยตำแหน่ง",          required: false, example: "0" },
  { key: "allowance_transport",label: "ค่าเดินทาง",             required: false, example: "0" },
  { key: "allowance_food",     label: "ค่าอาหาร",              required: false, example: "0" },
  { key: "allowance_phone",    label: "ค่าโทรศัพท์",            required: false, example: "0" },
  { key: "allowance_housing",  label: "ค่าที่พัก",              required: false, example: "0" },
  { key: "password",           label: "รหัสผ่าน",              required: false, example: "",          note: "เว้นว่าง = สร้างให้อัตโนมัติ" },
]

// ─── mapping Thai → system values ──────────────────────────────────
const GENDER_MAP: Record<string, string>   = { "ชาย": "male", "หญิง": "female", "อื่นๆ": "other", "อื่น": "other" }
const EMP_TYPE_MAP: Record<string, string> = { "ประจำ": "full_time", "พาร์ทไทม์": "part_time", "สัญญา": "contract", "ฝึกงาน": "intern" }
const EMP_STATUS_MAP: Record<string, string> = { "ทดลองงาน": "probation", "ปกติ": "active" }

// ─── Excel date serial → YYYY-MM-DD ────────────────────────────────
function excelDateToStr(v: any): string {
  if (!v) return ""
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v)
    if (!d) return String(v)
    return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`
  }
  if (typeof v === "string") {
    // allow d/m/yyyy or d-m-yyyy → normalise to yyyy-mm-dd
    const match = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (match) return `${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`
    return v
  }
  return String(v)
}

// ─── validate row ──────────────────────────────────────────────────
function validateRow(row: any, allEmails: string[], allCodes: string[], rowIdx: number): string[] {
  const errs: string[] = []
  if (!row.employee_code?.trim()) errs.push("ขาด: รหัสพนักงาน")
  if (!row.first_name_th?.trim()) errs.push("ขาด: ชื่อ (ไทย)")
  if (!row.last_name_th?.trim())  errs.push("ขาด: นามสกุล (ไทย)")
  if (!row.email?.trim())         errs.push("ขาด: อีเมล")
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errs.push("อีเมลไม่ถูกต้อง")
  if (!row.hire_date?.trim())     errs.push("ขาด: วันเริ่มงาน")
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.hire_date)) errs.push("วันเริ่มงานต้อง YYYY-MM-DD")
  if (row.national_id && row.national_id.replace(/\D/g,"").length !== 13) errs.push("เลขบัตรประชาชนต้อง 13 หลัก")

  // ตรวจ duplicate ในไฟล์
  const emailCount = allEmails.filter(e => e === row.email?.toLowerCase()).length
  const codeCount  = allCodes.filter(c => c === row.employee_code?.trim()).length
  if (emailCount > 1) errs.push("อีเมลซ้ำกันในไฟล์")
  if (codeCount  > 1) errs.push("รหัสพนักงานซ้ำกันในไฟล์")
  return errs
}

// ─── component ──────────────────────────────────────────────────────
interface Props {
  onClose: () => void
  companies: { id: string; name_th: string; code: string }[]
  defaultCompanyId?: string
  isSuperAdmin: boolean
  onImported: () => void
}

export default function ImportModal({ onClose, companies, defaultCompanyId, isSuperAdmin, onImported }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload")
  const [selectedCompany, setSelectedCompany] = useState(defaultCompanyId || "")
  const [rows,       setRows]       = useState<any[]>([])
  const [rowErrors,  setRowErrors]  = useState<Record<number, string[]>>({})
  const [results,    setResults]    = useState<any[]>([])
  const [progress,   setProgress]   = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const totalErrors = Object.values(rowErrors).filter(e => e.length > 0).length
  const validRows   = rows.filter((_, i) => !rowErrors[i]?.length)

  // ─── download template ────────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: ข้อมูล
    const headers = COLUMNS.map(c => c.required ? `${c.label}*` : c.label)
    const example = COLUMNS.map(c => c.example)
    const ws = XLSX.utils.aoa_to_sheet([headers, example])

    // column widths
    ws["!cols"] = COLUMNS.map(c => ({ wch: Math.max(c.label.length * 2, 16) }))

    // freeze header row
    ws["!freeze"] = { xSplit: 0, ySplit: 1 }

    XLSX.utils.book_append_sheet(wb, ws, "พนักงาน")

    // Sheet 2: คำแนะนำ
    const guide = XLSX.utils.aoa_to_sheet([
      ["คอลัมน์", "จำเป็น", "คำอธิบาย / ค่าที่ใช้ได้"],
      ...COLUMNS.map(c => [
        c.label + (c.required ? " *" : ""),
        c.required ? "ใช่" : "ไม่",
        c.note || (c.example ? `ตัวอย่าง: ${c.example}` : ""),
      ])
    ])
    guide["!cols"] = [{ wch: 24 }, { wch: 8 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(wb, guide, "คำแนะนำ")

    XLSX.writeFile(wb, "employee_import_template.xlsx")
    toast.success("ดาวโหลด template เรียบร้อย")
  }

  // ─── parse file ───────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: "array", cellDates: false })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })

        if (raw.length < 2) { toast.error("ไฟล์ไม่มีข้อมูล"); return }

        // map header → column key (strip asterisk, trim)
        const headerRow = (raw[0] as string[]).map(h => String(h).replace(/\*/g,"").trim())
        const colIndex: Record<string, number> = {}
        COLUMNS.forEach(col => {
          const idx = headerRow.findIndex(h => h === col.label)
          if (idx >= 0) colIndex[col.key] = idx
        })

        const parsed: any[] = []
        for (let r = 1; r < raw.length; r++) {
          const row = raw[r] as any[]
          // skip completely empty rows
          if (row.every(cell => cell === "" || cell === null || cell === undefined)) continue

          const obj: any = {}
          COLUMNS.forEach(col => {
            const idx = colIndex[col.key]
            const val = idx !== undefined ? row[idx] : ""
            // date fields
            if (["birth_date","hire_date","probation_end_date"].includes(col.key)) {
              obj[col.key] = excelDateToStr(val)
            } else if (col.key === "gender") {
              obj[col.key] = GENDER_MAP[String(val).trim()] || (val ? String(val) : "")
            } else if (col.key === "employment_type") {
              obj[col.key] = EMP_TYPE_MAP[String(val).trim()] || (val ? String(val) : "full_time")
            } else if (col.key === "employment_status") {
              obj[col.key] = EMP_STATUS_MAP[String(val).trim()] || (val ? String(val) : "probation")
            } else if (col.key === "national_id") {
              obj[col.key] = String(val || "").replace(/\D/g,"")
            } else {
              obj[col.key] = val !== null && val !== undefined ? String(val).trim() : ""
            }
          })
          parsed.push(obj)
        }

        // validate
        const allEmails = parsed.map(r => r.email?.toLowerCase() || "")
        const allCodes  = parsed.map(r => r.employee_code?.trim() || "")
        const errors: Record<number, string[]> = {}
        parsed.forEach((row, i) => {
          const errs = validateRow(row, allEmails, allCodes, i)
          if (errs.length) errors[i] = errs
        })

        setRows(parsed)
        setRowErrors(errors)
        setStep("preview")
      } catch (err: any) {
        toast.error("อ่านไฟล์ไม่ได้: " + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  // ─── import ──────────────────────────────────────────────────────
  const runImport = async () => {
    if (!selectedCompany) { toast.error("กรุณาเลือกบริษัท"); return }
    setStep("importing"); setProgress(0)

    const BATCH = 5
    const allResults: any[] = []

    for (let i = 0; i < validRows.length; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH)
      try {
        const res = await fetch("/api/employees/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: selectedCompany, rows: batch }),
        })
        const data = await res.json()
        if (!res.ok) {
          batch.forEach((_, j) => allResults.push({ row: i+j+1, success: false, error: data.error }))
        } else {
          allResults.push(...(data.results || []))
        }
      } catch {
        batch.forEach((_, j) => allResults.push({ row: i+j+1, success: false, error: "Network error" }))
      }
      setProgress(Math.round(((i + BATCH) / validRows.length) * 100))
    }

    setResults(allResults)
    setStep("done")
    onImported()
  }

  // ─── download failed rows ─────────────────────────────────────────
  const downloadFailed = () => {
    const failedIndices = results.filter(r => !r.success).map(r => r.row - 1)
    const failedRows = failedIndices.map(i => validRows[i]).filter(Boolean)
    if (!failedRows.length) return

    const headers = COLUMNS.map(c => c.label)
    const genderBack: Record<string,string>  = { male:"ชาย", female:"หญิง", other:"อื่นๆ" }
    const typeBack: Record<string,string>    = { full_time:"ประจำ", part_time:"พาร์ทไทม์", contract:"สัญญา", intern:"ฝึกงาน" }
    const statusBack: Record<string,string>  = { probation:"ทดลองงาน", active:"ปกติ" }
    const data = failedRows.map((row: any) => COLUMNS.map(c => {
      if (c.key === "gender")            return genderBack[row[c.key]]  || row[c.key]
      if (c.key === "employment_type")   return typeBack[row[c.key]]    || row[c.key]
      if (c.key === "employment_status") return statusBack[row[c.key]]  || row[c.key]
      return row[c.key] || ""
    }))

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
    ws["!cols"] = COLUMNS.map(c => ({ wch: Math.max(c.label.length * 2, 16) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "import_failed")
    XLSX.writeFile(wb, "employee_import_failed.xlsx")
  }

  const successCount = results.filter(r => r.success).length
  const failCount    = results.filter(r => !r.success).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-indigo-600"/>
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">นำเข้าพนักงานจาก Excel</h3>
              <p className="text-xs text-slate-400">
                {step === "upload"    && "ดาวโหลด template แล้ว upload ไฟล์ที่กรอกข้อมูลแล้ว"}
                {step === "preview"   && `${rows.length} แถว · ${totalErrors > 0 ? `${totalErrors} มีข้อผิดพลาด` : "พร้อม import"}` }
                {step === "importing" && `กำลัง import ${validRows.length} คน...`}
                {step === "done"      && `สำเร็จ ${successCount} · ล้มเหลว ${failCount}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={16} className="text-slate-500"/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ═══ Step: Upload ═══ */}
          {step === "upload" && (
            <>
              {/* Company selector */}
              {(isSuperAdmin) && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">บริษัทที่จะ import เข้า *</label>
                  <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 transition-all">
                    <option value="">— เลือกบริษัท —</option>
                    {companies.map(c => <option key={c.id} value={c.id}>[{c.code}] {c.name_th}</option>)}
                  </select>
                </div>
              )}

              {/* Download template */}
              <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl p-5 text-center space-y-3">
                <FileSpreadsheet size={32} className="mx-auto text-indigo-400"/>
                <p className="font-bold text-slate-700 text-sm">ขั้นตอนที่ 1: ดาวโหลด Template</p>
                <p className="text-xs text-slate-400">ไฟล์ Excel พร้อมหัวคอลัมน์และแถวตัวอย่าง</p>
                <button onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
                  <Download size={14}/> ดาวโหลด Template (.xlsx)
                </button>
              </div>

              {/* Upload area */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                }`}>
                <Upload size={28} className={`mx-auto mb-3 ${isDragging ? "text-indigo-500" : "text-slate-300"}`}/>
                <p className="font-bold text-slate-600 text-sm mb-1">ขั้นตอนที่ 2: Upload ไฟล์ที่กรอกข้อมูลแล้ว</p>
                <p className="text-xs text-slate-400">ลากวางหรือคลิกเพื่อเลือกไฟล์ .xlsx หรือ .xls</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) parseFile(e.target.files[0]) }} />
              </div>

              {/* Tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5"><Info size={12}/>ข้อควรระวัง</p>
                <ul className="text-xs text-amber-700 space-y-1 ml-4">
                  <li>• วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD (เช่น 2026-01-15)</li>
                  <li>• ชื่อแผนก/ตำแหน่ง/สาขาต้องตรงกับที่มีในระบบ</li>
                  <li>• คอลัมน์ที่มี * คือจำเป็นต้องกรอก</li>
                  <li>• รหัสผ่านเว้นว่างได้ — ระบบจะสร้างให้อัตโนมัติ</li>
                </ul>
              </div>
            </>
          )}

          {/* ═══ Step: Preview ═══ */}
          {step === "preview" && (
            <>
              {/* Summary bar */}
              <div className="flex gap-3">
                <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-slate-800">{rows.length}</p>
                  <p className="text-xs text-slate-400">แถวทั้งหมด</p>
                </div>
                <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-emerald-700">{rows.length - totalErrors}</p>
                  <p className="text-xs text-emerald-600">พร้อม import</p>
                </div>
                <div className={`flex-1 rounded-xl p-3 text-center ${totalErrors > 0 ? "bg-red-50" : "bg-slate-50"}`}>
                  <p className={`text-xl font-black ${totalErrors > 0 ? "text-red-600" : "text-slate-300"}`}>{totalErrors}</p>
                  <p className={`text-xs ${totalErrors > 0 ? "text-red-500" : "text-slate-400"}`}>มีข้อผิดพลาด</p>
                </div>
              </div>

              {totalErrors > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-700 mb-1">แถวที่มีข้อผิดพลาดจะถูกข้ามไป — กลับไปแก้ไขแล้ว re-upload เพื่อ import ให้ครบ</p>
                </div>
              )}

              {/* Preview table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-500 w-10">#</th>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-500 whitespace-nowrap">สถานะ</th>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-500 whitespace-nowrap">รหัส</th>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-500 whitespace-nowrap">ชื่อ</th>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-500 whitespace-nowrap">อีเมล</th>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-500 whitespace-nowrap">วันเริ่มงาน</th>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-500 whitespace-nowrap">เงินเดือน</th>
                        <th className="px-3 py-2.5 text-left font-bold text-slate-500">ข้อผิดพลาด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, i) => {
                        const errs = rowErrors[i] || []
                        const hasErr = errs.length > 0
                        return (
                          <tr key={i} className={hasErr ? "bg-red-50" : "hover:bg-slate-50"}>
                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2">
                              {hasErr
                                ? <XCircle size={14} className="text-red-500"/>
                                : <CheckCircle2 size={14} className="text-emerald-500"/>}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-700">{row.employee_code || <span className="text-red-400">—</span>}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-slate-800">{row.first_name_th} {row.last_name_th}</td>
                            <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate">{row.email}</td>
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.hire_date}</td>
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.base_salary ? `฿${(+row.base_salary).toLocaleString()}` : "—"}</td>
                            <td className="px-3 py-2">
                              {hasErr && (
                                <ul className="space-y-0.5">
                                  {errs.map((e, j) => <li key={j} className="text-red-600 whitespace-nowrap">{e}</li>)}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ═══ Step: Importing ═══ */}
          {step === "importing" && (
            <div className="py-8 text-center space-y-5">
              <Loader2 size={40} className="animate-spin mx-auto text-indigo-500"/>
              <div>
                <p className="font-bold text-slate-800">กำลัง import พนักงาน...</p>
                <p className="text-xs text-slate-400 mt-1">กรุณาอย่าปิดหน้าต่างนี้</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 max-w-sm mx-auto overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}/>
              </div>
              <p className="text-sm font-bold text-indigo-600">{progress}%</p>
            </div>
          )}

          {/* ═══ Step: Done ═══ */}
          {step === "done" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-3">
                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2"/>
                  <p className="text-2xl font-black text-emerald-700">{successCount}</p>
                  <p className="text-xs text-emerald-600 font-semibold">สำเร็จ</p>
                </div>
                <div className={`flex-1 border rounded-2xl p-4 text-center ${failCount > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-100"}`}>
                  {failCount > 0 ? <XCircle size={24} className="mx-auto text-red-500 mb-2"/> : <CheckCircle2 size={24} className="mx-auto text-slate-300 mb-2"/>}
                  <p className={`text-2xl font-black ${failCount > 0 ? "text-red-600" : "text-slate-300"}`}>{failCount}</p>
                  <p className={`text-xs font-semibold ${failCount > 0 ? "text-red-500" : "text-slate-400"}`}>ล้มเหลว</p>
                </div>
              </div>

              {/* Result rows */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 ${r.success ? "" : "bg-red-50"}`}>
                    {r.success
                      ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0"/>
                      : <XCircle size={14} className="text-red-500 flex-shrink-0"/>}
                    <span className="text-sm font-medium text-slate-700 flex-1">{r.name}</span>
                    {r.success && r.generated_password && (
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600">pw: {r.generated_password}</span>
                    )}
                    {!r.success && <span className="text-xs text-red-500 text-right max-w-[200px]">{r.error}</span>}
                  </div>
                ))}
              </div>

              {/* Generated passwords notice */}
              {results.some(r => r.success && r.generated_password) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                  <p className="text-xs text-amber-700">รหัสผ่านที่แสดงด้านบนจะไม่สามารถดูได้อีก — กรุณาบันทึกหรือแจ้งพนักงานก่อนปิดหน้าต่างนี้</p>
                </div>
              )}

              {failCount > 0 && (
                <button onClick={downloadFailed}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-red-200 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                  <Download size={14}/> ดาวโหลดแถวที่ล้มเหลวเพื่อแก้ไขและ re-upload
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex-shrink-0 flex items-center justify-between gap-3">
          {step === "upload" && (
            <>
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">ยกเลิก</button>
              <p className="text-xs text-slate-400">Upload ไฟล์เพื่อดำเนินการต่อ</p>
            </>
          )}
          {step === "preview" && (
            <>
              <button onClick={() => { setStep("upload"); setRows([]); setRowErrors({}) }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                <RotateCcw size={13}/> Upload ใหม่
              </button>
              <button onClick={runImport} disabled={validRows.length === 0 || !selectedCompany}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all">
                Import {validRows.length} คน <ChevronRight size={14}/>
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={onClose} className="w-full px-4 py-3 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all">
              เสร็จสิ้น
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
