"use client"
import { useState } from "react"

type Log = { t: string; ok: boolean; msg: string }

export default function MigrationPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState("")

  const log = (msg: string, ok = true) => {
    const t = new Date().toLocaleTimeString()
    setLogs(p => [...p, { t, ok, msg }])
  }

  const api = async (step: string, data?: any) => {
    const res = await fetch("/api/migration/import-employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, data, confirm: "YES_IMPORT" }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "API error")
    return json
  }

  const runAll = async () => {
    if (!confirm("จะลบพนักงานเก่าทั้งหมด (ยกเว้น SHD-005) และนำเข้าข้อมูลใหม่ 336 คน\n\nยืนยัน?")) return
    setRunning(true)
    setLogs([])

    try {
      // ── Load migration data ──
      setPhase("กำลังโหลดข้อมูล...")
      log("โหลด migration-data.json...")
      const res = await fetch("/migration-data.json?v=" + Date.now())
      const data = await res.json()
      log(`โหลดสำเร็จ: ${data.employees.length} พนักงาน, ${data.companies.length} บริษัท`)

      // ── Step 1: Cleanup ──
      setPhase("1/8 ลบข้อมูลเก่า...")
      log("ลบ records เก่า (ยกเว้น SHD-005)...")
      const cleanup = await api("cleanup")
      const okCount = Object.values(cleanup.results as Record<string, string>).filter(v => v === "OK").length
      log(`ลบสำเร็จ ${okCount} ตาราง, SHD-005: ${cleanup.kept?.employee_code || "OK"}`)

      // Show existing companies
      const existingCo = cleanup.existingCompanies || []
      log(`บริษัทที่มีอยู่: ${existingCo.map((c: any) => `${c.code}(${c.id.slice(0,8)})`).join(", ")}`)

      // ── Step 2: Resolve companies ──
      setPhase("2/8 จับคู่บริษัท...")
      log("จับคู่ migration companies → existing companies...")
      const coResolve = await api("resolve_companies", { desired: data.companies })
      const coMap = coResolve.mapping as Record<string, string> // desired_code → actual_id

      // Build oldId→newId mapping from migration data
      const oldIdToNew: Record<string, string> = {}
      for (const co of data.companies) {
        const newId = coMap[co.code]
        if (newId && newId !== co.id) {
          oldIdToNew[co.id] = newId
        }
      }

      const remapCount = Object.keys(oldIdToNew).length
      log(`จับคู่เสร็จ: ${Object.keys(coMap).length} บริษัท${remapCount > 0 ? ` (remap ${remapCount})` : ""}`)
      for (const [code, id] of Object.entries(coMap)) {
        log(`  ${code} → ${(id as string).slice(0, 8)}...`)
      }

      // ── Step 3: Reference data (departments, branches, positions, shifts) ──
      setPhase("3/8 แผนก + สาขา...")
      for (const { table, label, items } of [
        { table: "departments", label: "แผนก", items: data.departments },
        { table: "branches", label: "สาขา", items: data.branches },
        { table: "positions", label: "ตำแหน่ง", items: data.positions },
        { table: "shift_templates", label: "กะการทำงาน", items: data.shift_templates },
      ]) {
        log(`Upsert ${items.length} ${label}...`)
        const r = await api("upsert", { table, rows: items, companyMapping: oldIdToNew })
        const errMsg = r.errorCount ? ` (${r.errorCount} errors)` : ""
        log(`${label}: ${r.count} OK${errMsg}`, !r.errorCount)
        if (r.errors?.length) {
          for (const e of r.errors.slice(0, 3)) log(`  ERR: ${e}`, false)
        }
      }

      // ── Step 4: Employees ──
      setPhase("4/8 พนักงาน...")
      const batchSize = 30
      let empTotal = 0, empErrors = 0
      for (let i = 0; i < data.employees.length; i += batchSize) {
        const batch = data.employees.slice(i, i + batchSize)
        log(`Import พนักงาน ${i + 1}-${Math.min(i + batchSize, data.employees.length)} / ${data.employees.length}...`)
        const r = await api("upsert_employees", { rows: batch, companyMapping: oldIdToNew })
        empTotal += r.count || 0
        empErrors += r.errorCount || 0
        if (r.errors?.length) {
          for (const e of r.errors.slice(0, 3)) log(`  ERR: ${e}`, false)
        }
      }
      log(`พนักงาน: ${empTotal} OK${empErrors ? `, ${empErrors} errors` : ""}`, empErrors === 0)

      // ── Step 5: Supervisors ──
      setPhase("5/8 หัวหน้างาน...")
      log(`ตั้ง supervisor ${data.supervisor_updates.length} คน...`)
      const supRes = await api("supervisors", { updates: data.supervisor_updates })
      if (supRes.needsMigration) {
        log(`supervisor_id column ไม่มี! กรุณา run SQL นี้ใน Supabase SQL Editor:`, false)
        log(supRes.sql, false)
        log(`แล้ว run migration อีกครั้ง (ข้อมูลพนักงานเข้าครบแล้ว แค่ต้อง set supervisor + manager)`, false)
      } else {
        log(`supervisor: ${supRes.ok} OK, ${supRes.fail} fail`, supRes.fail === 0)
        if (supRes.errors?.length) supRes.errors.slice(0,5).forEach((e: string) => log(`  ERR: ${e}`, false))
      }

      // ── Step 6: Manager roles ──
      setPhase("6/8 สิทธิ์ Manager...")
      log(`ตั้ง role manager ${data.manager_employee_ids.length} คน...`)
      const mgrRes = await api("managers", { manager_employee_ids: data.manager_employee_ids })
      log(`manager: ${mgrRes.ok} OK, ${mgrRes.fail} fail`, mgrRes.fail === 0)
      if (mgrRes.errors?.length) mgrRes.errors.slice(0,5).forEach((e: string) => log(`  ERR: ${e}`, false))

      // ── Step 7: Auto-assign schedules from DB ──
      setPhase("7/8 ตารางกะ...")
      log("สร้างตารางกะอัตโนมัติจากข้อมูลใน DB...")
      const schedRes = await api("auto_schedules", {})
      log(`Schedule: ${schedRes.profiles} profiles, ${schedRes.workSchedules} work_schedules`)

      // ── Step 8: Populate manager history ──
      setPhase("8/8 ประวัติหัวหน้า...")
      log("สร้าง employee_manager_history จาก supervisor_id...")
      const mhRes = await api("populate_manager_history", {})
      log(`Manager history: ${mhRes.ok} OK, ${mhRes.fail || 0} fail`)
      if (mhRes.errors?.length) mhRes.errors.slice(0,3).forEach((e: string) => log(`  ERR: ${e}`, false))

      setPhase("เสร็จสิ้น!")
      log(`=== นำเข้าเสร็จ: ${empTotal} พนักงาน ===`, true)
    } catch (e: any) {
      log(`ERROR: ${e.message}`, false)
      setPhase("เกิดข้อผิดพลาด")
    }
    setRunning(false)
  }

  // ── Fix branches ──
  const fixBranches = async () => {
    if (!confirm("จะ Deduplicate branches (119→67) + สร้าง allowed locations ให้ทุกคน?\n\nยืนยัน?")) return
    setRunning(true)
    setLogs([])

    try {
      setPhase("1/2 Dedup branches...")
      log("Deduplicate branches (53 ซ้ำ → merge, remap employees)...")
      const r1 = await fetch("/api/migration/fix-branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "dedup_branches", confirm: "YES_FIX" }),
      }).then(r => r.json())

      if (r1.error) { log(`ERROR: ${r1.error}`, false) }
      else {
        log(`Dedup: remap ${r1.remapped_employees} employees, ลบ ${r1.deleted_branches} branches`)
        if (r1.errors?.length) r1.errors.forEach((e: string) => log(`  ERR: ${e}`, false))
      }

      setPhase("2/2 Assign locations...")
      log("สร้าง employee_allowed_locations (ทุกคน = ICS Mall + สาขาตัวเอง)...")
      const r2 = await fetch("/api/migration/fix-branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "assign_locations", confirm: "YES_FIX" }),
      }).then(r => r.json())

      if (r2.error) { log(`ERROR: ${r2.error}`, false) }
      else {
        log(`Locations: ${r2.employees} employees, ${r2.locations_created} locations created`)
      }

      setPhase("เสร็จสิ้น!")
      log("=== Fix branches เสร็จ ===", true)
    } catch (e: any) {
      log(`ERROR: ${e.message}`, false)
    }
    setRunning(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800">นำเข้าข้อมูลพนักงาน</h2>
        <p className="text-sm text-slate-500 mt-1">Import จาก Excel → ลบเก่า (ยกเว้น SHD-005) → นำเข้าใหม่ 336 คน</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-bold">คำเตือน:</p>
        <ul className="mt-1 space-y-0.5 text-xs">
          <li>- ลบพนักงานเก่าทั้งหมด ยกเว้น SHD-005</li>
          <li>- จับคู่บริษัทกับที่มีอยู่ใน Supabase อัตโนมัติ (ไม่สร้างซ้ำ)</li>
          <li>- นำเข้า 327 พนักงาน + 9 ผู้บริหารพิเศษ = 336 คน</li>
          <li>- ตั้ง supervisor 318 คน, role manager 37 คน</li>
          <li>- ตั้งกะการทำงาน 327 คน (แน่นอน/ไม่แน่นอน)</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={runAll}
          disabled={running}
          className={`flex-1 py-4 rounded-xl text-lg font-black transition-colors ${
            running ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {running ? `กำลังทำงาน... ${phase}` : "นำเข้าพนักงาน"}
        </button>

        <button
          onClick={fixBranches}
          disabled={running}
          className={`py-4 px-6 rounded-xl text-sm font-black transition-colors ${
            running ? "bg-slate-200 text-slate-400" : "bg-orange-600 text-white hover:bg-orange-700"
          }`}
        >
          Fix Branches + Locations
        </button>
      </div>

      {/* hidden placeholder removed */}

      {logs.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-4 max-h-[60vh] overflow-y-auto font-mono text-xs">
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
