import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, EMP_FIELDS, recipient, empName, currentManagerMap, type EmpLite } from "@/lib/feishu-notify"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/request-detail?type=leave|ot|adjustment|offsite|resignation&id=<request_id>
//   คืน "รายละเอียดคำขอแบบครบ" ให้บอท render การ์ดละเอียด (ทั้งฝั่งหัวหน้า/ลูกน้อง)
//   webhook ส่ง request_type+request_id เบาๆ → บอทเรียกอันนี้ต่อ
//   ⚠️ ไม่คืนข้อมูลเงินเดือน
// ════════════════════════════════════════════════════════════════════

const TABLE: Record<string, { table: string; label: string; dateField: string }> = {
  leave:       { table: "leave_requests",           label: "ลา",              dateField: "start_date" },
  ot:          { table: "overtime_requests",        label: "ทำงานล่วงเวลา (OT)", dateField: "work_date" },
  adjustment:  { table: "time_adjustment_requests", label: "ขอแก้ไขเวลา",      dateField: "work_date" },
  offsite:     { table: "offsite_checkin_requests", label: "เช็คอินนอกสถานที่", dateField: "work_date" },
  resignation: { table: "resignation_requests",     label: "ลาออก",            dateField: "last_work_date" },
}

const STATUS_LABEL: Record<string, string> = {
  pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ",
  pending_intent: "รอ HR เปิดสิทธิ์", intent_approved: "เปิดสิทธิ์แล้ว",
  pending_manager: "รอหัวหน้าอนุมัติ", pending_hr: "รอ HR อนุมัติ",
  cancel_requested: "ขอยกเลิก",
}

function fmtDate(d?: string | null): string | null {
  if (!d) return null
  const s = String(d).slice(0, 10)
  const [y, m, dd] = s.split("-")
  if (!y) return s
  return `${dd}/${m}/${(parseInt(y) + 543).toString().slice(2)}` // พ.ศ. ย่อ
}
function fmtTime(t?: string | null): string | null {
  if (!t) return null
  const m = /(\d{1,2}:\d{2})/.exec(String(t))
  return m ? m[1] : String(t)
}

export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams
  const type = (p.get("type") || "").toLowerCase()
  const id = p.get("id") || p.get("request_id")
  const cfg = TABLE[type]
  if (!cfg || !id) return NextResponse.json({ error: "ต้องระบุ type (leave|ot|adjustment|offsite|resignation) และ id" }, { status: 400 })

  const { data: r, error } = await s.from(cfg.table).select("*").eq("id", id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!r) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 })

  // ผู้ยื่น
  const { data: empRow } = await s.from("employees").select(EMP_FIELDS).eq("id", r.employee_id).maybeSingle()
  const emp = (empRow as unknown as EmpLite) || null

  // หัวหน้าปัจจุบัน
  let manager: any = null
  const mgrMap = await currentManagerMap(s, [r.employee_id])
  const mgrId = r.manager_id || mgrMap.get(r.employee_id)
  if (mgrId) {
    const { data: m } = await s.from("employees").select(EMP_FIELDS).eq("id", mgrId).maybeSingle()
    if (m) manager = recipient(m as unknown as EmpLite)
  }

  // ผู้อนุมัติ (ถ้ามี)
  let reviewer: string | null = null
  if (r.reviewed_by) {
    const { data: rv } = await s.from("employees").select("first_name_th,last_name_th,nickname").eq("id", r.reviewed_by).maybeSingle()
    if (rv) reviewer = empName(rv as any)
  }

  // รายละเอียดเฉพาะประเภท (label/value)
  const details: { label: string; value: string }[] = []
  const add = (label: string, value: any) => { if (value !== null && value !== undefined && value !== "") details.push({ label, value: String(value) }) }
  let summary = ""

  if (type === "leave") {
    let ltName: string | null = null
    if (r.leave_type_id) {
      const { data: lt } = await s.from("leave_types").select("name").eq("id", r.leave_type_id).maybeSingle()
      ltName = lt?.name ?? null
    }
    const range = r.start_date === r.end_date ? fmtDate(r.start_date) : `${fmtDate(r.start_date)} – ${fmtDate(r.end_date)}`
    add("ประเภทลา", ltName)
    add("วันที่", range + (r.is_half_day ? ` (ครึ่งวัน${r.half_day_period === "morning" ? "เช้า" : r.half_day_period === "afternoon" ? "บ่าย" : ""})` : ""))
    add("จำนวนวัน", r.total_days != null ? `${r.total_days} วัน` : null)
    add("เหตุผล", r.reason)
    const nAtt = (r.attachment_urls?.length || 0) + (r.attachment_url ? 1 : 0)
    if (nAtt) add("ไฟล์แนบ", `${nAtt} ไฟล์`)
    summary = `ขอ${ltName || "ลา"} ${range}${r.total_days ? ` (${r.total_days} วัน)` : ""}`
  } else if (type === "ot") {
    let mins = r.ot_minutes != null ? Number(r.ot_minutes) : null
    if ((mins == null || mins === 0) && r.ot_start && r.ot_end) {
      const a = fmtTime(r.ot_start), b = fmtTime(r.ot_end)
      if (a && b) { const [ah, am] = a.split(":").map(Number); const [bh, bm] = b.split(":").map(Number); mins = (bh * 60 + bm) - (ah * 60 + am); if (mins < 0) mins += 1440 }
    }
    const hrs = mins != null ? (mins / 60).toFixed(1).replace(/\.0$/, "") : null
    add("วันที่", fmtDate(r.work_date))
    add("เวลา", r.ot_start ? `${fmtTime(r.ot_start)} – ${fmtTime(r.ot_end)}` : null)
    add("จำนวนชั่วโมง", hrs ? `${hrs} ชม.` : null)
    add("อัตรา", r.ot_rate ? `${r.ot_rate}x` : null)
    add("เหตุผล", r.reason)
    summary = `ขอ OT ${fmtDate(r.work_date)}${hrs ? ` ${hrs} ชม.` : ""}`
  } else if (type === "adjustment") {
    add("วันที่", fmtDate(r.work_date))
    add("ขอแก้เวลาเข้า", fmtTime(r.requested_clock_in))
    add("ขอแก้เวลาออก", fmtTime(r.requested_clock_out))
    add("เหตุผล", r.reason)
    summary = `ขอแก้ไขเวลา ${fmtDate(r.work_date)}`
  } else if (type === "offsite") {
    add("วันที่", fmtDate(r.work_date))
    add("ประเภท", r.check_type === "check_out" ? "เช็คเอาท์" : "เช็คอิน")
    add("สถานที่", r.location_name)
    if (r.latitude && r.longitude) add("พิกัด", `${r.latitude}, ${r.longitude}`)
    add("หมายเหตุ", r.note)
    summary = `เช็คอินนอกสถานที่ ${r.location_name || fmtDate(r.work_date)}`
  } else if (type === "resignation") {
    const reasons = Array.isArray(r.reasons) ? r.reasons.join(", ") : (r.reasons || r.other_reason || r.intent_reason)
    add("วันทำงานสุดท้าย", fmtDate(r.last_work_date))
    add("วันมีผล", fmtDate(r.effective_date))
    add("เหตุผล", reasons)
    if (r.manager_note) add("หมายเหตุหัวหน้า", r.manager_note)
    if (r.hr_note) add("หมายเหตุ HR", r.hr_note)
    summary = `ยื่นลาออก${r.last_work_date ? ` (วันสุดท้าย ${fmtDate(r.last_work_date)})` : ""}`
  }

  const statusLabel = STATUS_LABEL[r.status] || r.status

  return NextResponse.json({
    request: {
      type, type_label: cfg.label, id: r.id,
      status: r.status, status_label: statusLabel,
      created_at: r.created_at, reviewed_at: r.reviewed_at ?? r.manager_approved_at ?? r.hr_approved_at ?? null,
      review_note: r.review_note ?? r.manager_note ?? r.hr_note ?? null,
      reviewer,
    },
    requester: emp ? { ...recipient(emp), department: emp.department?.name ?? null, position: emp.position?.name ?? null } : { employee_id: r.employee_id },
    manager,                 // หัวหน้าที่ต้องอนุมัติ (มี feishu_user_id/open_id)
    details,                 // label/value พร้อม render
    summary,                 // สรุปบรรทัดเดียว
  })
}
