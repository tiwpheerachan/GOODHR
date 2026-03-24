"use client"
import { useState } from "react"
import { Upload, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import * as XLSX from "xlsx"

interface ShiftRow {
  employee_code: string
  shift: string
  schedule_type: string
  dayoff: string
  work_code: string
}

export default function ImportShiftPage() {
  const [rows, setRows] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [fileName, setFileName] = useState("")

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" })

      const mapped: ShiftRow[] = raw
        .filter(r => r["กะการทำงาน"] && r["รหัสพนักงาน"])
        .map(r => ({
          employee_code: String(r["รหัสพนักงาน"]).trim(),
          shift: String(r["กะการทำงาน"]).trim(),
          schedule_type: String(r["เช็คกะ"] || "กะแน่นอน").trim(),
          dayoff: String(r["วันหยุด"] || "เสาร์-อาทิตย์").trim(),
          work_code: String(r["รหัสทำงาน"] || "").trim(),
        }))

      setRows(mapped)
    }
    reader.readAsArrayBuffer(file)
  }

  const doImport = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/shifts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees: rows }),
      })
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setResult({ error: err.message })
    }
    setLoading(false)
  }

  // Group by shift + schedule_type + dayoff for summary
  const summary = rows.reduce<Record<string, number>>((acc, r) => {
    const key = `${r.shift} | ${r.schedule_type} | หยุด: ${r.dayoff}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/shifts" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft size={18}/></Link>
        <div>
          <h2 className="text-xl font-black text-slate-800">นำเข้าตารางกะจาก Excel</h2>
          <p className="text-sm text-slate-400 mt-0.5">อัปโหลดไฟล์ Excel ที่มีคอลัมน์ รหัสพนักงาน, กะการทำงาน, เช็คกะ, วันหยุด</p>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
          <Upload size={24} className="text-slate-400"/>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-600">{fileName || "เลือกไฟล์ Excel"}</p>
            <p className="text-xs text-slate-400 mt-1">รองรับ .xlsx — ต้องมีคอลัมน์: รหัสพนักงาน, กะการทำงาน, เช็คกะ, วันหยุด</p>
          </div>
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden"/>
        </label>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">ตัวอย่างข้อมูล ({rows.length} คน)</h3>
            <button onClick={doImport} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm">
              {loading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
              นำเข้าทั้งหมด ({rows.length} คน)
            </button>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">สรุปข้อมูล</p>
            <div className="space-y-1">
              {Object.entries(summary).sort((a,b) => b[1] - a[1]).map(([k,v]) => (
                <div key={k} className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-indigo-600 w-8 text-right">{v}</span>
                  <span className="text-slate-600">{k}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table preview */}
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">รหัส</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">กะ</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">ประเภท</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">วันหยุด</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">รหัสทำงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-mono font-bold text-slate-700">{r.employee_code}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.shift.includes("11") ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                      }`}>{r.shift}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.schedule_type === "กะไม่แน่นอน" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      }`}>{r.schedule_type}</span>
                    </td>
                    <td className="px-3 py-1.5 text-slate-600">{r.dayoff}</td>
                    <td className="px-3 py-1.5 text-slate-400">{r.work_code || "—"}</td>
                  </tr>
                ))}
                {rows.length > 50 && (
                  <tr><td colSpan={5} className="px-3 py-2 text-center text-slate-400">... อีก {rows.length - 50} รายการ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-2xl p-6 border shadow-sm ${
          result.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
        }`}>
          {result.success ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 size={20} className="text-emerald-600"/>
                <h3 className="font-bold text-emerald-800">นำเข้าสำเร็จ!</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l: "ข้อมูลทั้งหมด", v: result.total },
                  { l: "ตรงกับระบบ", v: result.matched },
                  { l: "สร้าง Profile", v: result.profiles_created },
                  { l: "ผิดพลาด", v: result.errors },
                ].map(s => (
                  <div key={s.l} className="bg-white rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-slate-800">{s.v}</p>
                    <p className="text-[10px] text-slate-500">{s.l}</p>
                  </div>
                ))}
              </div>
              {result.not_found_codes?.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">
                    <AlertTriangle size={12} className="inline mr-1"/>
                    ไม่พบในระบบ ({result.not_found_codes.length} รหัส):
                  </p>
                  <p className="text-xs text-amber-600">{result.not_found_codes.join(", ")}</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-600"/>
              <p className="font-bold text-red-800">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
