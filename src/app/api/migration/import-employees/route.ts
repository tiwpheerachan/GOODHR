import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

const KEEP = "11655ff2-5e7e-4e80-8a26-e910aa257192" // SHD-005

export async function POST(req: NextRequest) {
  try {
    const { step, data, confirm } = await req.json()
    if (confirm !== "YES_IMPORT") {
      return NextResponse.json({ error: "Confirmation required" }, { status: 400 })
    }
    const supa = createServiceClient()

    // ── STEP 1: cleanup ──
    if (step === "cleanup") {
      const empTables = [
        "payroll_records", "attendance_records", "leave_requests", "leave_balances",
        "salary_structures", "work_schedules", "employee_manager_history",
        "overtime_requests", "time_adjustment_requests", "notifications",
        "employee_loans", "employee_schedule_profiles", "monthly_shift_assignments",
        "offsite_checkin_requests", "employee_allowed_locations", "resignation_requests",
        "kpi_forms",
      ]
      const results: Record<string, string> = {}

      // Delete all employee-dependent records
      for (const t of empTables) {
        try {
          const { error } = await supa.from(t).delete().neq("employee_id", KEEP)
          results[t] = error ? `ERR: ${error.message}` : "OK"
        } catch (e: any) { results[t] = `SKIP: ${e.message}` }
      }

      // Delete users (except SHD-005's)
      const { error: uErr } = await supa.from("users").delete()
        .not("employee_id", "is", null).neq("employee_id", KEEP)
      results["users"] = uErr ? `ERR: ${uErr.message}` : "OK"

      // Delete employees (except SHD-005)
      const { error: eErr } = await supa.from("employees").delete().neq("id", KEEP)
      results["employees"] = eErr ? `ERR: ${eErr.message}` : "OK"

      // Nullify SHD-005 FK refs so we can clean ref tables
      await supa.from("employees").update({
        department_id: null, position_id: null, branch_id: null,
      }).eq("id", KEEP)

      // Clean ref tables (safe now — no FK deps except SHD-005 which has nulls)
      for (const refTable of ["positions", "departments", "branches", "shift_templates"]) {
        try {
          // Delete ALL rows — we'll re-insert everything
          const { error } = await supa.from(refTable).delete().gte("created_at", "1900-01-01")
          if (error) {
            // Fallback: try with neq on a dummy
            const { error: e2 } = await supa.from(refTable).delete().neq("id", "00000000-0000-0000-0000-000000000000")
            results[refTable] = e2 ? `ERR: ${e2.message}` : "OK"
          } else {
            results[refTable] = "OK"
          }
        } catch (e: any) { results[refTable] = `SKIP: ${e.message}` }
      }

      // Get existing companies (DON'T delete these — just use them)
      const { data: existingCompanies } = await supa.from("companies").select("id,code,name_th")
      results["companies_found"] = `${existingCompanies?.length || 0} existing`

      // Verify SHD-005
      const { data: kept } = await supa.from("employees").select("id,employee_code").eq("id", KEEP).single()

      return NextResponse.json({
        step: "cleanup", results, kept,
        existingCompanies: existingCompanies || [],
      })
    }

    // ── STEP 2: resolve companies ──
    if (step === "resolve_companies") {
      const { desired } = data
      const { data: existing } = await supa.from("companies").select("id,code,name_th")

      // Explicit mapping for known companies
      const KNOWN: Record<string, string[]> = {
        SHD: ["SHD"],
        RABBIT: ["RABBIT"],
        TOP_ONE: ["TOP1", "TOP_ONE", "TOPONE"],
        PTC: ["PTC"],
      }

      const mapping: Record<string, string> = {}

      for (const d of desired) {
        // Try explicit known mapping first
        const candidates = KNOWN[d.code] || [d.code]
        let match = null
        for (const candidate of candidates) {
          match = existing?.find((e: any) => e.code === candidate)
          if (match) break
        }

        if (!match) {
          // Fuzzy: normalize and compare
          const norm = (s: string) => s.replace(/[^A-Z0-9]/gi, "").toUpperCase()
          match = existing?.find((e: any) => norm(e.code) === norm(d.code))
        }

        if (!match) {
          // Name-based match
          match = existing?.find((e: any) =>
            e.name_th?.toLowerCase().includes(d.code.toLowerCase().replace("_", " ")) ||
            d.name_th?.toLowerCase().includes(e.code?.toLowerCase())
          )
        }

        if (match) {
          mapping[d.code] = match.id
        } else {
          // Create new company
          const { data: created, error } = await supa.from("companies")
            .insert({ code: d.code, name_th: d.name_th, name_en: d.name_en || d.name_th, is_active: true })
            .select("id").single()
          if (error) {
            return NextResponse.json({ error: `Company ${d.code}: ${error.message}` }, { status: 500 })
          }
          mapping[d.code] = created.id
        }
      }

      return NextResponse.json({ step: "resolve_companies", mapping })
    }

    // ── STEP 3: upsert reference data (with company_id remapping) ──
    if (step === "upsert") {
      const { table, rows, companyMapping } = data
      if (!table || !rows?.length) return NextResponse.json({ error: "Need table+rows" }, { status: 400 })

      // Remap company_id if mapping provided
      const remapped = companyMapping ? rows.map((r: any) => {
        const newRow = { ...r }
        if (r.company_id && companyMapping[r.company_id]) {
          newRow.company_id = companyMapping[r.company_id]
        }
        // Also remap shift_id if shift_templates were remapped
        // (shift_templates have company_id embedded in their UUID generation)
        return newRow
      }) : rows

      // For work_schedules, skip rows with invalid shift_id
      if (table === "work_schedules") {
        const { data: shifts } = await supa.from("shift_templates").select("id")
        const validShiftIds = new Set((shifts || []).map((s: any) => s.id))
        const before = remapped.length
        const filtered = remapped.filter((r: any) => !r.shift_id || validShiftIds.has(r.shift_id))
        if (filtered.length < before) {
          // Some shift_ids are invalid — skip those
          const skipped = before - filtered.length
          // Try inserting valid ones only
          let total2 = 0
          for (let i = 0; i < filtered.length; i += 50) {
            const chunk = filtered.slice(i, i + 50)
            const { error } = await supa.from(table).upsert(chunk, { onConflict: "id" })
            if (!error) total2 += chunk.length
          }
          return NextResponse.json({ step: "upsert", table, count: total2, skipped })
        }
      }

      let total = 0
      const errors: string[] = []

      for (let i = 0; i < remapped.length; i += 50) {
        const chunk = remapped.slice(i, i + 50)
        const { error } = await supa.from(table).upsert(chunk, { onConflict: "id" })
        if (error) {
          // Batch failed — try one by one
          for (const row of chunk) {
            const { error: e2 } = await supa.from(table).upsert(row, { onConflict: "id" })
            if (e2) {
              // Last resort: delete + insert
              if (row.id) {
                await supa.from(table).delete().eq("id", row.id)
                const { error: e3 } = await supa.from(table).insert(row)
                if (e3) errors.push(`${row.id}: ${e3.message}`)
                else total++
              } else {
                errors.push(`${JSON.stringify(row).slice(0, 60)}: ${e2.message}`)
              }
            } else { total++ }
          }
        } else { total += chunk.length }
      }

      return NextResponse.json({
        step: "upsert", table, count: total,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        errorCount: errors.length,
      })
    }

    // ── STEP 4: upsert employees (with all remapping) ──
    if (step === "upsert_employees") {
      const { rows, companyMapping } = data
      if (!rows?.length) return NextResponse.json({ error: "No rows" }, { status: 400 })

      let total = 0
      const errors: string[] = []

      for (let i = 0; i < rows.length; i += 30) {
        const chunk = rows.slice(i, i + 30).map((r: any) => {
          const newRow = { ...r }
          // Remap company_id
          if (r.company_id && companyMapping?.[r.company_id]) {
            newRow.company_id = companyMapping[r.company_id]
          }
          return newRow
        })

        const { error } = await supa.from("employees").upsert(chunk, { onConflict: "id" })
        if (error) {
          // One by one
          for (const row of chunk) {
            const { error: e2 } = await supa.from("employees").upsert(row, { onConflict: "id" })
            if (e2) {
              errors.push(`${row.employee_code}: ${e2.message}`)
            } else { total++ }
          }
        } else { total += chunk.length }
      }

      return NextResponse.json({ step: "upsert_employees", count: total, errorCount: errors.length, errors: errors.slice(0, 20) })
    }

    // ── STEP 5: update supervisor ──
    if (step === "supervisors") {
      const { updates } = data

      // Ensure supervisor_id column exists
      try {
        const rpcResult = await supa.rpc("exec_sql", {
          query: "ALTER TABLE employees ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES employees(id);"
        })
        // Ignore RPC errors — column might already exist or function might not exist
        void rpcResult
      } catch {
        // Silently ignore — we'll check via test update below
      }

      // First, try to add the column if it doesn't exist
      // Use a test update to check
      const testUpdate = await supa.from("employees")
        .update({ supervisor_id: null })
        .eq("id", "00000000-0000-0000-0000-000000000000") // non-existent row, just testing column

      if (testUpdate.error?.message?.includes("supervisor_id")) {
        // Column doesn't exist — return instruction
        return NextResponse.json({
          step: "supervisors", ok: 0, fail: updates.length,
          needsMigration: true,
          sql: "ALTER TABLE employees ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES employees(id);",
          errors: ["Column supervisor_id does not exist. Please run the SQL above in Supabase SQL Editor first."]
        })
      }

      let ok = 0, fail = 0
      const errors: string[] = []
      for (const u of updates) {
        const { error } = await supa.from("employees")
          .update({ supervisor_id: u.supervisor_id })
          .eq("id", u.id)
        if (error) {
          fail++
          if (errors.length < 10) errors.push(`${u.id.slice(0,8)}: ${error.message}`)
        } else ok++
      }
      return NextResponse.json({ step: "supervisors", ok, fail, errors })
    }

    // ── STEP 6: create manager users ──
    if (step === "managers") {
      const { manager_employee_ids } = data
      let ok = 0, fail = 0
      const errors: string[] = []

      for (const eid of manager_employee_ids) {
        // Get employee's company_id
        const { data: emp } = await supa.from("employees")
          .select("id,company_id").eq("id", eid).maybeSingle()
        if (!emp) {
          fail++
          if (errors.length < 5) errors.push(`${eid.slice(0,8)}: employee not found`)
          continue
        }

        const { data: existing } = await supa.from("users")
          .select("id").eq("employee_id", eid).maybeSingle()

        if (existing) {
          const { error } = await supa.from("users")
            .update({ role: "manager", is_active: true })
            .eq("employee_id", eid)
          if (error) {
            fail++
            if (errors.length < 5) errors.push(`${eid.slice(0,8)}: update: ${error.message}`)
          } else ok++
        } else {
          const { error } = await supa.from("users").insert({
            id: crypto.randomUUID(),
            employee_id: eid,
            company_id: emp.company_id,
            role: "manager",
            is_active: true,
          })
          if (error) {
            fail++
            if (errors.length < 5) errors.push(`${eid.slice(0,8)}: insert: ${error.message}`)
          } else ok++
        }
      }
      return NextResponse.json({ step: "managers", ok, fail, errors })
    }

    // ── STEP 7: auto-create schedules from DB data ──
    if (step === "auto_schedules") {
      // Get all employees
      const { data: emps } = await supa.from("employees").select("id,company_id,employee_code").eq("is_active", true)
      if (!emps?.length) return NextResponse.json({ step: "auto_schedules", profiles: 0, workSchedules: 0 })

      // Get shift templates indexed by company
      const { data: shifts } = await supa.from("shift_templates").select("id,company_id,name")
      const shiftByCompany: Record<string, any[]> = {}
      for (const s of (shifts || [])) {
        if (!shiftByCompany[s.company_id]) shiftByCompany[s.company_id] = []
        shiftByCompany[s.company_id].push(s)
      }

      // Load schedule info from migration data
      let migrationData: any = {}
      try {
        const fs = require("fs")
        const raw = fs.readFileSync("public/migration-data.json", "utf8")
        migrationData = JSON.parse(raw)
      } catch {}

      // Build emp_code → schedule info map from migration data
      const schedInfoMap: Record<string, any> = {}
      const empCodeToMigId: Record<string, string> = {}
      for (const e of (migrationData.employees || [])) {
        empCodeToMigId[e.employee_code] = e.id
      }
      for (const sp of (migrationData.schedule_profiles || [])) {
        // Find employee_code for this profile
        const empCode = Object.entries(empCodeToMigId).find(([, id]) => id === sp.employee_id)?.[0]
        if (empCode) {
          schedInfoMap[empCode] = {
            schedule_type: sp.schedule_type || "fixed",
            fixed_dayoffs: sp.fixed_dayoffs,
            work_code: sp.work_code,
          }
        }
      }

      let profileCount = 0, wsCount = 0

      for (const emp of emps) {
        const companyShifts = shiftByCompany[emp.company_id] || []
        // Default: first shift (09:00-18:00)
        const defaultShift = companyShifts.find((s: any) => s.name === "09:00-18:00") || companyShifts[0]

        const info = schedInfoMap[emp.employee_code] || { schedule_type: "fixed", fixed_dayoffs: ["sat", "sun"] }

        // Upsert schedule profile
        const { error: spErr } = await supa.from("employee_schedule_profiles")
          .upsert({
            employee_id: emp.id,
            company_id: emp.company_id,
            schedule_type: info.schedule_type,
            default_shift_id: defaultShift?.id || null,
            fixed_dayoffs: info.fixed_dayoffs,
            work_code: info.work_code,
          }, { onConflict: "employee_id" })
        if (!spErr) profileCount++

        // Upsert work schedule
        if (defaultShift) {
          const { error: wsErr } = await supa.from("work_schedules")
            .upsert({
              employee_id: emp.id,
              company_id: emp.company_id,
              shift_id: defaultShift.id,
              effective_from: "2025-01-01",
              is_active: true,
            }, { onConflict: "id" })
            // work_schedules might not have unique on employee_id, so just insert
          if (wsErr) {
            // Try insert instead
            await supa.from("work_schedules").insert({
              employee_id: emp.id,
              company_id: emp.company_id,
              shift_id: defaultShift.id,
              effective_from: "2025-01-01",
              is_active: true,
            })
          }
          wsCount++
        }
      }

      return NextResponse.json({ step: "auto_schedules", profiles: profileCount, workSchedules: wsCount })
    }

    // ── STEP 8: populate employee_manager_history from supervisor_id ──
    if (step === "populate_manager_history") {
      // Get all employees with supervisor_id
      const { data: emps } = await supa.from("employees")
        .select("id,supervisor_id,company_id")
        .not("supervisor_id", "is", null)
        .eq("is_active", true)

      if (!emps?.length) return NextResponse.json({ step: "populate_manager_history", ok: 0, message: "No supervisor_id found" })

      let ok = 0, fail = 0
      const errors: string[] = []

      for (const emp of emps) {
        // Check if already has active record
        const { data: existing } = await supa.from("employee_manager_history")
          .select("id")
          .eq("employee_id", emp.id)
          .eq("manager_id", emp.supervisor_id)
          .is("effective_to", null)
          .maybeSingle()

        if (existing) { ok++; continue } // Already exists

        // Close any previous manager records
        await supa.from("employee_manager_history")
          .update({ effective_to: new Date().toISOString().split("T")[0] })
          .eq("employee_id", emp.id)
          .is("effective_to", null)

        // Insert new record
        const { error } = await supa.from("employee_manager_history").insert({
          employee_id: emp.id,
          manager_id: emp.supervisor_id,
          effective_from: "2025-01-01",
          effective_to: null,
        })

        if (error) {
          fail++
          if (errors.length < 10) errors.push(`${emp.id.slice(0,8)}: ${error.message}`)
        } else {
          ok++
        }
      }

      return NextResponse.json({ step: "populate_manager_history", ok, fail, total: emps.length, errors })
    }

    return NextResponse.json({ error: "Unknown step" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
