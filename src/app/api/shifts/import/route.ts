import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/shifts/import
 * นำเข้าข้อมูลกะจาก Excel → สร้าง shift_templates + employee_schedule_profiles
 *
 * Body: {
 *   employees: Array<{
 *     employee_code: string
 *     shift: "09.00-18.00" | "11.00-20.00" | string
 *     schedule_type: "กะแน่นอน" | "กะไม่แน่นอน"
 *     dayoff: "เสาร์-อาทิตย์" | "อาทิตย์" | "พุธ" | "ไม่แน่นอน" | string
 *     work_code?: string
 *   }>
 * }
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supa = createServiceClient()
    const body = await req.json()
    const employees: any[] = body.employees ?? []

    if (employees.length === 0) {
      return NextResponse.json({ error: "ไม่มีข้อมูลพนักงาน" }, { status: 400 })
    }

    // ═══ 1. รวบรวมบริษัทจาก employee codes ═══
    const codes = employees.map(e => e.employee_code).filter(Boolean)
    const { data: empRows } = await supa
      .from("employees")
      .select("id, employee_code, company_id")
      .in("employee_code", codes)

    if (!empRows || empRows.length === 0) {
      return NextResponse.json({ error: "ไม่พบพนักงานในระบบ" }, { status: 404 })
    }

    const empMap = new Map(empRows.map(e => [e.employee_code, e]))
    const companyIds = Array.from(new Set(empRows.map(e => e.company_id)))

    // ═══ 2. ดึง shift templates ที่มีอยู่ ═══
    const { data: existingShifts } = await supa
      .from("shift_templates")
      .select("id, company_id, name, work_start, work_end")
      .in("company_id", companyIds)

    // ═══ 3. สร้าง shift templates ที่ขาด ═══
    const SHIFT_DEFS = [
      { key: "09:00", name: "กะเช้า 09:00-18:00", work_start: "09:00:00", work_end: "18:00:00", break_minutes: 60 },
      { key: "11:00", name: "กะสาย 11:00-20:00", work_start: "11:00:00", work_end: "20:00:00", break_minutes: 60 },
    ]

    // Map: company_id -> shift_key -> shift_id
    const shiftMap = new Map<string, Map<string, string>>()

    for (const cid of companyIds) {
      const map = new Map<string, string>()
      const existing = (existingShifts ?? []).filter(s => s.company_id === cid)

      for (const def of SHIFT_DEFS) {
        // ค้นหาจาก work_start ที่ตรงกัน
        const found = existing.find(s => s.work_start?.slice(0, 5) === def.key)
        if (found) {
          map.set(def.key, found.id)
        } else {
          // สร้างใหม่
          const { data: newShift } = await supa.from("shift_templates").insert({
            company_id: cid,
            name: def.name,
            shift_type: "normal",
            work_start: def.work_start,
            work_end: def.work_end,
            break_minutes: def.break_minutes,
            is_overnight: false,
            ot_start_after_minutes: 30,
            is_active: true,
          }).select("id").single()
          if (newShift) map.set(def.key, newShift.id)
        }
      }
      shiftMap.set(cid, map)
    }

    // ═══ 4. แปลง dayoff เป็น fixed_dayoffs ═══
    const parseDayoff = (d: string): string[] => {
      if (!d) return []
      const norm = d.trim()
      if (norm === "เสาร์-อาทิตย์") return ["sat", "sun"]
      if (norm === "อาทิตย์") return ["sun"]
      if (norm === "พุธ") return ["wed"]
      if (norm === "ไม่แน่นอน") return []
      const dayMap: Record<string, string> = {
        "จันทร์": "mon", "อังคาร": "tue", "พุธ": "wed",
        "พฤหัสบดี": "thu", "ศุกร์": "fri", "เสาร์": "sat", "อาทิตย์": "sun"
      }
      return norm.split(/[-,\s]+/).map(w => dayMap[w.trim()]).filter(Boolean)
    }

    // ═══ 5. แปลง shift key จาก Excel ═══
    const parseShiftKey = (s: string): string => {
      if (!s) return "09:00"
      if (s.includes("11")) return "11:00"
      return "09:00"
    }

    // ═══ 6. สร้าง employee_schedule_profiles ═══
    const profiles: any[] = []
    const notFound: string[] = []
    const noShift: string[] = []

    for (const row of employees) {
      const emp = empMap.get(row.employee_code)
      if (!emp) { notFound.push(row.employee_code); continue }

      const companyShifts = shiftMap.get(emp.company_id)
      if (!companyShifts) { noShift.push(row.employee_code); continue }

      const shiftKey = parseShiftKey(row.shift)
      const shiftId = companyShifts.get(shiftKey)
      if (!shiftId) { noShift.push(row.employee_code); continue }

      const schedType = row.schedule_type === "กะไม่แน่นอน" ? "variable" : "fixed"
      const dayoffs = parseDayoff(row.dayoff)

      profiles.push({
        employee_id: emp.id,
        company_id: emp.company_id,
        schedule_type: schedType,
        default_shift_id: shiftId,
        fixed_dayoffs: dayoffs,
        work_code: row.work_code ?? null,
      })
    }

    // ═══ 7. Batch upsert profiles (chunks of 200) ═══
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < profiles.length; i += 200) {
      const batch = profiles.slice(i, i + 200)
      const { error } = await supa.from("employee_schedule_profiles").upsert(
        batch,
        { onConflict: "employee_id" }
      )
      if (error) {
        console.error("Upsert error:", error)
        errorCount += batch.length
      } else {
        successCount += batch.length
      }
    }

    // ═══ 8. Auto-generate ตารางเดือนปัจจุบัน + เดือนหน้า ═══
    const DAY_MAP_GEN: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
    const now = new Date()
    const months = [
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    ]
    // ถ้าวันที่ > 15 ก็ gen เดือนหน้าด้วย
    if (now.getDate() > 15) {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      months.push(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`)
    }

    let totalGenerated = 0

    for (const monthStr of months) {
      const [yStr, mStr] = monthStr.split("-")
      const genYear = parseInt(yStr)
      const genMon = parseInt(mStr)
      // สร้างวันในเดือน
      const genDays: string[] = []
      const d = new Date(genYear, genMon - 1, 1)
      while (d.getMonth() === genMon - 1) {
        genDays.push(d.toISOString().split("T")[0])
        d.setDate(d.getDate() + 1)
      }

      const genRows: any[] = []
      for (const p of profiles) {
        const dayoffs = (p.fixed_dayoffs ?? []) as string[]
        const shiftId = p.default_shift_id ?? null

        for (const date of genDays) {
          const dow = new Date(date).getDay()
          const dayName = Object.entries(DAY_MAP_GEN).find(([, v]) => v === dow)?.[0] ?? ""
          const isDayoff = dayoffs.includes(dayName)

          // Variable ไม่มี dayoffs → ใส่ work ทุกวัน (หัวหน้าจะแก้ทีหลัง)
          if (p.schedule_type === "variable" && dayoffs.length === 0 && shiftId) {
            genRows.push({
              employee_id: p.employee_id,
              company_id: p.company_id,
              work_date: date,
              shift_id: shiftId,
              assignment_type: "work",
              assigned_by: null,
            })
          } else {
            genRows.push({
              employee_id: p.employee_id,
              company_id: p.company_id,
              work_date: date,
              shift_id: isDayoff ? null : shiftId,
              assignment_type: isDayoff ? "dayoff" : "work",
              assigned_by: null,
            })
          }
        }
      }

      // Batch upsert assignments
      for (let i = 0; i < genRows.length; i += 500) {
        const chunk = genRows.slice(i, i + 500)
        await supa.from("monthly_shift_assignments").upsert(
          chunk,
          { onConflict: "employee_id,work_date" }
        )
      }
      totalGenerated += genRows.length
    }

    return NextResponse.json({
      success: true,
      total: employees.length,
      matched: employees.length - notFound.length,
      profiles_created: successCount,
      assignments_generated: totalGenerated,
      months_generated: months,
      errors: errorCount,
      not_found_codes: notFound.slice(0, 20),
      no_shift_codes: noShift.slice(0, 20),
      shifts_created: SHIFT_DEFS.length * companyIds.length,
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
