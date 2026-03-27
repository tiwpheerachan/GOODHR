import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * POST /api/shifts/self-schedule/submit
 *
 * พนักงานส่งกะที่วางเอง
 * - วันที่ยังไม่มีกะ → เข้า monthly_shift_assignments ทันที
 * - วันที่มีกะอยู่แล้ว → สร้าง shift_change_requests (pending) รอหัวหน้าอนุมัติ
 *
 * Body: {
 *   changes: [{ work_date, shift_id, assignment_type, reason? }]
 * }
 */

function todayBKK(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const body = await req.json()

  // ── ดึงข้อมูลพนักงาน ───────────────────────────────────────
  const { data: userData } = await supa
    .from("users")
    .select("id, employee_id, role, employees(id, company_id, can_self_schedule)")
    .eq("id", user.id)
    .single()

  const emp = userData?.employees as any
  if (!emp?.id) return NextResponse.json({ success: false, error: "Employee not found" })

  // ตรวจสิทธิ์
  if (!emp.can_self_schedule) {
    return NextResponse.json({ success: false, error: "คุณไม่มีสิทธิ์วางกะเอง กรุณาติดต่อ HR" })
  }

  const { changes } = body as {
    changes: Array<{
      work_date: string
      shift_id: string | null
      assignment_type: "work" | "dayoff" | "leave"
      leave_type?: string
      reason?: string
    }>
  }

  if (!changes?.length) {
    return NextResponse.json({ success: false, error: "No changes provided" })
  }

  const today = todayBKK()

  // วันย้อนหลัง → ต้องเข้า shift_change_requests เท่านั้น (ไม่ direct insert)
  // วันปัจจุบัน/อนาคต → ถ้าไม่มีกะ direct insert, มีกะแล้ว → change request
  const validChanges = changes // อนุญาตย้อนหลังได้
  if (validChanges.length === 0) {
    return NextResponse.json({ success: false, error: "ไม่มีข้อมูลการเปลี่ยนแปลง" })
  }

  // ── ดึง assignment ที่มีอยู่แล้ว ───────────────────────────────
  const dates = validChanges.map(c => c.work_date)
  const { data: existingAssignments } = await supa
    .from("monthly_shift_assignments")
    .select("work_date, shift_id, assignment_type")
    .eq("employee_id", emp.id)
    .in("work_date", dates)

  const existingMap = new Map(
    (existingAssignments ?? []).map((a: any) => [a.work_date, a])
  )

  // ── แบ่ง: วางใหม่ vs ขอเปลี่ยน ──────────────────────────────
  const directInserts: any[] = []    // วันที่ยังไม่มีกะ → เข้า monthly ทันที
  const changeRequests: any[] = []   // วันที่มีกะแล้ว → สร้าง request

  for (const c of validChanges) {
    const existing = existingMap.get(c.work_date)
    const isPast = c.work_date < today

    if (!existing && !isPast) {
      // ── วันปัจจุบัน/อนาคต ไม่มีกะ: เข้า monthly_shift_assignments ทันที ──
      directInserts.push({
        employee_id: emp.id,
        company_id: emp.company_id,
        work_date: c.work_date,
        shift_id: c.shift_id,
        assignment_type: c.assignment_type,
        leave_type: c.leave_type ?? null,
        assigned_by: null,
        submitted_by: user.id,
        has_pending_change: false,
      })
    } else if (!existing && isPast) {
      // ── วันย้อนหลัง ไม่มีกะ: ต้องส่ง request เพื่อให้หัวหน้าตรวจสอบ ──
      changeRequests.push({
        employee_id: emp.id,
        company_id: emp.company_id,
        work_date: c.work_date,
        current_shift_id: null,
        current_assignment_type: null,
        requested_shift_id: c.shift_id,
        requested_assignment_type: c.assignment_type,
        reason: c.reason || "ขอเปลี่ยนกะย้อนหลัง",
        status: "pending",
      })
    } else if (existing) {
      // ── มีกะอยู่แล้ว: ตรวจว่าเปลี่ยนจริงไหม ──
      const sameShift = existing.shift_id === c.shift_id && existing.assignment_type === c.assignment_type
      if (sameShift) continue // ไม่มีการเปลี่ยนแปลง

      changeRequests.push({
        employee_id: emp.id,
        company_id: emp.company_id,
        work_date: c.work_date,
        current_shift_id: existing.shift_id,
        current_assignment_type: existing.assignment_type,
        requested_shift_id: c.shift_id,
        requested_assignment_type: c.assignment_type,
        reason: c.reason || (isPast ? "ขอเปลี่ยนกะย้อนหลัง" : null),
        status: "pending",
      })
    }
  }

  let insertedCount = 0
  let pendingCount = 0

  // ── 1. Insert วันใหม่ทันที ──────────────────────────────────
  if (directInserts.length > 0) {
    const { error } = await supa
      .from("monthly_shift_assignments")
      .upsert(directInserts, { onConflict: "employee_id,work_date" })

    if (error) return NextResponse.json({ success: false, error: error.message })
    insertedCount = directInserts.length
  }

  // ── 2. สร้าง change requests + mark has_pending_change ──────
  if (changeRequests.length > 0) {
    // ลบ pending เก่าของวันเดียวกัน (ถ้ามี) แล้วสร้างใหม่
    const pendingDates = changeRequests.map(r => r.work_date)
    await supa
      .from("shift_change_requests")
      .update({ status: "withdrawn" })
      .eq("employee_id", emp.id)
      .eq("status", "pending")
      .in("work_date", pendingDates)

    const { error: reqErr } = await supa
      .from("shift_change_requests")
      .insert(changeRequests)

    if (reqErr) return NextResponse.json({ success: false, error: reqErr.message })

    // Mark has_pending_change ใน monthly_shift_assignments
    for (const date of pendingDates) {
      await supa
        .from("monthly_shift_assignments")
        .update({ has_pending_change: true })
        .eq("employee_id", emp.id)
        .eq("work_date", date)
    }

    pendingCount = changeRequests.length
  }

  return NextResponse.json({
    success: true,
    inserted: insertedCount,
    pending: pendingCount,
    message: insertedCount > 0 && pendingCount > 0
      ? `วางกะ ${insertedCount} วัน + ส่งขอเปลี่ยน ${pendingCount} วัน (รอหัวหน้าอนุมัติ)`
      : insertedCount > 0
        ? `วางกะ ${insertedCount} วันสำเร็จ`
        : `ส่งขอเปลี่ยนกะ ${pendingCount} วัน (รอหัวหน้าอนุมัติ)`,
  })
}
