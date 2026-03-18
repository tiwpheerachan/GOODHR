"use client"
import { useState } from "react"
import * as XLSX from "xlsx"

type Log = { t: string; ok: boolean; msg: string }
type Account = {
  employee_code: string; nickname: string; first_name: string; last_name: string
  company: string; department: string; position: string
  email: string; password: string; role: string; skip: boolean
}

export default function CreateAccountsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [result, setResult] = useState<{ ok: number; fail: number; skip: number; deleted: number } | null>(null)

  const log = (msg: string, ok = true) => {
    const t = new Date().toLocaleTimeString()
    setLogs(p => [...p, { t, ok, msg }])
  }

  const resetAndCreate = async () => {
    if (!confirm(
      "จะลบ Auth accounts เก่าทั้งหมด (ยกเว้น SHD-005)\n" +
      "แล้วสร้างใหม่ทุกคนพร้อมรหัสผ่านใหม่\n\n" +
      "ยืนยัน?"
    )) return

    setRunning(true)
    setLogs([])
    setResult(null)

    try {
      // Load accounts data
      setPhase("โหลดข้อมูล...")
      log("โหลด auth-accounts.json...")
      const res = await fetch("/auth-accounts.json?v=" + Date.now())
      const data: Account[] = await res.json()
      setAccounts(data)

      const canCreate = data.filter(a => !a.skip)
      log(`ทั้งหมด ${data.length} คน: สร้างได้ ${canCreate.length} คน`)

      // Batch reset+create (30 at a time to avoid timeout)
      setPhase("ลบเก่า + สร้างใหม่...")
      const batchSize = 25
      let totalOk = 0, totalFail = 0, totalSkip = 0, totalDeleted = 0
      let isFirstBatch = true

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        const batchNum = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(data.length / batchSize)
        log(`Batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, data.length)})...`)

        if (isFirstBatch) {
          // First batch: also deletes all old auth users
          const r = await fetch("/api/migration/reset-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accounts: batch, confirm: "YES_RESET_AUTH" }),
          })
          const json = await r.json()
          if (!r.ok) { log(`ERROR: ${json.error}`, false); continue }
          totalDeleted = json.deletedCount || 0
          totalOk += json.ok || 0
          totalFail += json.fail || 0
          totalSkip += json.skip || 0
          log(`ลบ auth เก่า ${totalDeleted} accounts`)
          if (json.errors?.length) json.errors.slice(0, 3).forEach((e: string) => log(`  ERR: ${e}`, false))
          isFirstBatch = false
        } else {
          // Subsequent batches: just create
          const r = await fetch("/api/migration/create-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accounts: batch, confirm: "YES_CREATE_AUTH" }),
          })
          const json = await r.json()
          if (!r.ok) { log(`ERROR: ${json.error}`, false); continue }
          totalOk += json.ok || 0
          totalFail += json.fail || 0
          totalSkip += json.skip || 0
          if (json.errors?.length) json.errors.slice(0, 3).forEach((e: string) => log(`  ERR: ${e}`, false))
        }
      }

      setResult({ ok: totalOk, fail: totalFail, skip: totalSkip, deleted: totalDeleted })
      log(`=== เสร็จ: ลบ ${totalDeleted}, สร้างสำเร็จ ${totalOk}, fail ${totalFail}, skip ${totalSkip} ===`, totalFail === 0)
      setPhase("เสร็จสิ้น!")
    } catch (e: any) {
      log(`ERROR: ${e.message}`, false)
      setPhase("เกิดข้อผิดพลาด")
    }
    setRunning(false)
  }

  const exportExcel = () => {
    if (!accounts.length) return
    const rows = accounts.map(a => ({
      "รหัสพนักงาน": a.employee_code,
      "ชื่อเล่น": a.nickname,
      "ชื่อ": a.first_name,
      "นามสกุล": a.last_name,
      "บริษัท": a.company,
      "แผนก": a.department,
      "ตำแหน่ง": a.position,
      "Email (ใช้ Login)": a.email || "(ไม่มี)",
      "รหัสผ่าน": a.password || "-",
      "Role": a.role,
      "สถานะ": a.skip ? "ข้าม (ไม่มี email)" : "สร้างแล้ว",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws["!cols"] = [
      { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
      { wch: 10 }, { wch: 22 }, { wch: 30 },
      { wch: 35 }, { wch: 14 }, { wch: 10 }, { wch: 18 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Accounts")
    XLSX.writeFile(wb, "goodhr-accounts-NEW.xlsx")
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800">Reset + สร้าง Auth Accounts ใหม่</h2>
        <p className="text-sm text-slate-500 mt-1">ลบ auth เก่าทั้งหมด → สร้างใหม่ → เชื่อม users table → Export Excel</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
        <p className="font-bold">คำเตือน — ลบ Auth เก่าทั้งหมด:</p>
        <ul className="mt-1 space-y-0.5 text-xs">
          <li>- ลบ Supabase Auth accounts ทั้งหมด (ยกเว้น SHD-005)</li>
          <li>- สร้างใหม่ 319 accounts พร้อมรหัสผ่านใหม่</li>
          <li>- เชื่อม auth.users → users table → employees ให้ถูกต้อง 100%</li>
          <li>- รหัสผ่านเก่าจะใช้ไม่ได้ ต้องใช้รหัสใหม่จาก Excel</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={resetAndCreate}
          disabled={running}
          className={`flex-1 py-4 rounded-xl text-lg font-black transition-colors ${
            running ? "bg-slate-200 text-slate-400" : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {running ? `กำลังทำงาน... ${phase}` : "ลบเก่า + สร้าง Auth ใหม่ทั้งหมด"}
        </button>

        {accounts.length > 0 && (
          <button
            onClick={exportExcel}
            className="px-6 py-4 rounded-xl text-lg font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            Export Excel
          </button>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
            <p className="text-3xl font-black text-slate-600">{result.deleted}</p>
            <p className="text-xs font-bold text-slate-500 mt-1">ลบเก่า</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-3xl font-black text-green-700">{result.ok}</p>
            <p className="text-xs font-bold text-green-600 mt-1">สร้างสำเร็จ</p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
            <p className="text-3xl font-black text-red-700">{result.fail}</p>
            <p className="text-xs font-bold text-red-600 mt-1">ล้มเหลว</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
            <p className="text-3xl font-black text-slate-600">{result.skip}</p>
            <p className="text-xs font-bold text-slate-500 mt-1">ข้าม</p>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-4 max-h-[50vh] overflow-y-auto font-mono text-xs">
          {logs.map((l, i) => (
            <div key={i} className={`py-0.5 ${l.ok ? "text-green-400" : "text-red-400"}`}>
              <span className="text-slate-500">[{l.t}]</span> {l.msg}
            </div>
          ))}
          {running && <div className="text-yellow-400 animate-pulse mt-1">กำลังทำงาน...</div>}
        </div>
      )}
    </div>
  )
}
