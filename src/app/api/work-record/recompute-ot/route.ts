import { NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

// POST — recompute attendance_records.ot_minutes สำหรับ (employee_id, work_date)
// จาก overtime_requests ที่ status=approved (source of truth)
// ใช้หลัง admin แก้ OT จากหน้า work-record/[id] โดยตรง
//
// หมายเหตุ: ตัวคำนวณ payroll หลังจากนี้รันแบบ best-effort — ไม่ block response
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { employee_id, work_date } = await req.json()
  if (!employee_id || !work_date) {
    return NextResponse.json({ success: false, error: "employee_id and work_date required" }, { status: 400 })
  }

  const supa = createServiceClient()

  // 1. รวม OT minutes จาก approved requests ทั้งหมดของวันนั้น
  const { data: approvedOts } = await supa.from("overtime_requests")
    .select("ot_start, ot_end, company_id")
    .eq("employee_id", employee_id)
    .eq("work_date", work_date)
    .eq("status", "approved")

  let totalOtMin = 0
  for (const ot of (approvedOts ?? [])) {
    if (!ot.ot_start || !ot.ot_end) continue
    const m = Math.max(0, Math.round((new Date(ot.ot_end).getTime() - new Date(ot.ot_start).getTime()) / 60000))
    totalOtMin += m
  }

  // 2. update / insert attendance_records.ot_minutes
  const { data: attRec } = await supa.from("attendance_records")
    .select("id, ot_minutes")
    .eq("employee_id", employee_id)
    .eq("work_date", work_date)
    .maybeSingle()

  if (attRec) {
    if ((attRec.ot_minutes || 0) !== totalOtMin) {
      await supa.from("attendance_records").update({
        ot_minutes: totalOtMin,
        updated_at: new Date().toISOString(),
      }).eq("id", attRec.id)
    }
  } else if (totalOtMin > 0) {
    const companyId = (approvedOts?.[0] as any)?.company_id ?? null
    await supa.from("attendance_records").insert({
      employee_id, company_id: companyId, work_date,
      status: "present",
      ot_minutes: totalOtMin,
      late_minutes: 0, early_out_minutes: 0, work_minutes: 0,
      is_manual: true,
      note: `OT อนุมัติ ${totalOtMin} นาที`,
    })
  }

  return NextResponse.json({ success: true, ot_minutes: totalOtMin })
}
