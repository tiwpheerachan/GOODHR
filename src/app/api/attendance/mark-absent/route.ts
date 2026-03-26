import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/attendance/mark-absent
 *
 * ระบบ auto-mark absent: เรียกทุกวัน (แนะนำ 00:30 เวลาไทย)
 * สร้าง attendance_records สถานะ "absent" ให้พนักงานที่ไม่ได้เช็คอิน
 * ในวันทำงานก่อนหน้า (เมื่อวาน หรือ specific date)
 *
 * Body (optional):
 *   { date?: "2026-03-23", secret?: "..." }
 *   ถ้าไม่ส่ง date → ใช้เมื่อวาน (เวลาไทย)
 *
 * Security: ตรวจสอบด้วย CRON_SECRET header หรือ body.secret
 */

// ── Date helpers ──────────────────────────────────────────────────
function todayTH(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
}

function addDays(ds: string, n: number): string {
  const [y, m, d] = ds.split("-").map(Number)
  const dt = new Date(y, m - 1, d + n)
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0"),
  ].join("-")
}

function dayOfWeek(ds: string): number {
  const [y, m, d] = ds.split("-").map(Number)
  return new Date(y, m - 1, d).getDay() // 0=อา, 6=ส
}

export async function POST(req: Request) {
  // ── Security: ตรวจสอบ secret ──────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("x-cron-secret") || req.headers.get("authorization")

  let body: any = {}
  try { body = await req.json() } catch { /* empty body OK */ }

  if (cronSecret) {
    const provided = authHeader?.replace("Bearer ", "") || body.secret
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supa = createServiceClient()

  // ── กำหนดวันที่จะ mark absent ─────────────────────────────────
  const targetDate = body.date || addDays(todayTH(), -1) // default = เมื่อวาน

  // ตรวจว่าเป็นวันทำงาน (จ-ศ)
  const dow = dayOfWeek(targetDate)
  if (dow === 0 || dow === 6) {
    return NextResponse.json({
      success: true,
      message: `${targetDate} เป็นวันหยุด (${dow === 0 ? "อาทิตย์" : "เสาร์"}) — ไม่ต้อง mark absent`,
      marked: 0,
    })
  }

  // ── ดึงพนักงาน active ทั้งหมด ─────────────────────────────────
  const { data: employees, error: empErr } = await supa
    .from("employees")
    .select("id, company_id, hire_date, is_attendance_exempt, resignation_date")
    .eq("is_active", true)

  if (empErr) {
    return NextResponse.json({ error: empErr.message }, { status: 500 })
  }

  // กรอง: ต้องจ้างแล้ว (hire_date <= targetDate) + ยังไม่ลาออก
  const activeEmps = (employees ?? []).filter((e: any) => {
    if (e.hire_date && e.hire_date > targetDate) return false
    if (e.resignation_date && e.resignation_date <= targetDate) return false
    return true
  })

  if (activeEmps.length === 0) {
    return NextResponse.json({ success: true, message: "ไม่มีพนักงานที่ active", marked: 0 })
  }

  const empIds = activeEmps.map((e: any) => e.id as string)
  const exemptIds = new Set(activeEmps.filter((e: any) => e.is_attendance_exempt).map((e: any) => e.id as string))

  // ── ดึง company_ids ที่มีวันหยุดตรงกับ targetDate ─────────────
  const companyIds = Array.from(new Set(activeEmps.map((e: any) => e.company_id as string)))

  const { data: holidays } = await supa
    .from("company_holidays")
    .select("company_id, date")
    .in("company_id", companyIds)
    .eq("date", targetDate)
    .eq("is_active", true)

  const holidayCompanySet = new Set((holidays ?? []).map((h: any) => h.company_id as string))

  // กรองพนักงานที่วันนี้เป็นวันหยุดบริษัทออก
  const workingEmps = activeEmps.filter((e: any) => !holidayCompanySet.has(e.company_id as string))

  if (workingEmps.length === 0) {
    return NextResponse.json({ success: true, message: `${targetDate} เป็นวันหยุดของทุกบริษัท`, marked: 0 })
  }

  const workingEmpIds = workingEmps.map((e: any) => e.id as string)

  // ── ดึง attendance records ที่มีอยู่แล้วสำหรับวันนี้ ─────────
  const { data: existingRecords } = await supa
    .from("attendance_records")
    .select("employee_id")
    .eq("work_date", targetDate)
    .in("employee_id", workingEmpIds)

  const hasRecordSet = new Set((existingRecords ?? []).map((r: any) => r.employee_id as string))

  // ── ดึงวันลาที่ approved ครอบคลุมวันนี้ ──────────────────────
  const { data: leaveData } = await supa
    .from("leave_requests")
    .select("employee_id")
    .eq("status", "approved")
    .lte("start_date", targetDate)
    .gte("end_date", targetDate)
    .in("employee_id", workingEmpIds)

  const onLeaveSet = new Set((leaveData ?? []).map((l: any) => l.employee_id as string))

  // ── หาพนักงานที่ต้อง mark absent ─────────────────────────────
  const toMarkAbsent = workingEmpIds.filter((id: string) => {
    if (hasRecordSet.has(id)) return false    // มี record แล้ว (เช็คอินแล้ว)
    if (onLeaveSet.has(id)) return false       // ลาอนุมัติแล้ว
    if (exemptIds.has(id)) return false        // exempt ไม่ต้องเช็คอิน
    return true
  })

  if (toMarkAbsent.length === 0) {
    return NextResponse.json({
      success: true,
      message: `${targetDate} — พนักงานทุกคนเช็คอินแล้ว/ลาแล้ว/exempt`,
      marked: 0,
      stats: {
        total_active: workingEmpIds.length,
        already_checked_in: hasRecordSet.size,
        on_leave: onLeaveSet.size,
        exempt: Array.from(exemptIds).filter(id => workingEmpIds.includes(id)).length,
      },
    })
  }

  // ── สร้าง absent records ──────────────────────────────────────
  const absentRecords = toMarkAbsent.map((empId: string) => {
    const emp = workingEmps.find((e: any) => e.id === empId) as any
    return {
      employee_id: empId,
      company_id: emp.company_id,
      work_date: targetDate,
      status: "absent",
      clock_in: null,
      clock_out: null,
      late_minutes: 0,
      early_out_minutes: 0,
      work_minutes: 0,
      ot_minutes: 0,
      check_method: "auto",
      note: "ระบบ mark absent อัตโนมัติ — ไม่มีการเช็คอิน",
    }
  })

  // upsert เพื่อป้องกัน duplicate (employee_id + work_date unique)
  const { error: insertErr, count } = await supa
    .from("attendance_records")
    .upsert(absentRecords, { onConflict: "employee_id,work_date", ignoreDuplicates: true })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `${targetDate} — mark absent สำเร็จ`,
    marked: toMarkAbsent.length,
    date: targetDate,
    stats: {
      total_active: workingEmpIds.length,
      already_checked_in: hasRecordSet.size,
      on_leave: onLeaveSet.size,
      exempt: Array.from(exemptIds).filter(id => workingEmpIds.includes(id)).length,
      marked_absent: toMarkAbsent.length,
    },
  })
}

// ── GET: สำหรับทดสอบ / health check ─────────────────────────────
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/attendance/mark-absent",
    description: "Auto-mark absent สำหรับพนักงานที่ไม่เช็คอิน",
    usage: "POST { date?: 'YYYY-MM-DD', secret?: '...' }",
    note: "เรียกทุกวัน 00:30 เวลาไทย หรือ manual ได้",
  })
}
