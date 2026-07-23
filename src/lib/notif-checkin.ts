// ── แจ้งเตือนเข้า Feishu ทันทีเมื่อพนักงานเช็คอิน/เช็คเอาท์ (fire-and-forget) ──
//   gated ด้วย rollout · ส่งผ่าน feishu-send · log · ไม่ throw (กัน check-in พัง)
import { createServiceClient } from "@/lib/supabase/server"
import { enabledRecipientSet } from "@/lib/notif-rollout"
import { autoSend } from "@/lib/notif-autosend"
import type { CardRow } from "@/lib/feishu-send"

const nameOf = (e: any) => e ? `${e.first_name_th || ""} ${e.last_name_th || ""}${e.nickname ? ` (${e.nickname})` : ""}`.trim() : null
const hhmm = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }) : "-"

type CheckinData = { timeISO: string; lateMinutes?: number; isLate?: boolean; shiftStart?: string | null; locationName?: string | null }
type CheckoutData = { timeISO: string; workMinutes?: number; earlyOutMinutes?: number; locationName?: string | null }

export async function notifyCheckin(employeeId: string, kind: "clock_in" | "clock_out", data: CheckinData | CheckoutData): Promise<void> {
  try {
    if (!employeeId) return
    const svc = createServiceClient()
    // เปิดสิทธิ์รับไหม (rollout)
    const enabled = await enabledRecipientSet(svc, [employeeId])
    if (!enabled.has(employeeId)) return
    // Feishu id จริง
    const { data: fu } = await svc.from("feishu_users").select("open_id, feishu_user_id").eq("goodhr_employee_id", employeeId).limit(1).maybeSingle()
    if (!fu?.open_id && !fu?.feishu_user_id) return
    const { data: e } = await svc.from("employees").select("first_name_th, last_name_th, nickname").eq("id", employeeId).maybeSingle()
    const name = nameOf(e)

    let title = "", color = "green", body = "", rows: CardRow[] = []
    if (kind === "clock_in") {
      const d = data as CheckinData
      const late = d.lateMinutes || 0
      const isLate = !!d.isLate && late > 0
      title = isLate ? `🕐 เช็คอินแล้ว · สาย ${late} นาที` : "✅ เช็คอินสำเร็จ"
      color = isLate ? "orange" : "green"
      body = "บันทึกการเข้างานเรียบร้อยแล้ว"
      rows = [
        { label: "⏰ เวลาเข้า", value: hhmm(d.timeISO) },
        { label: "สถานะ", value: isLate ? `สาย ${late} นาที` : "ตรงเวลา ✅" },
      ]
      if (d.shiftStart) rows.push({ label: "🕘 กะเริ่ม", value: d.shiftStart.slice(0, 5) })
      if (d.locationName) rows.push({ label: "📍 สถานที่", value: d.locationName })
    } else {
      const d = data as CheckoutData
      const wm = d.workMinutes || 0
      title = "🏁 เช็คเอาท์สำเร็จ"
      color = "blue"
      body = "บันทึกการออกงานเรียบร้อยแล้ว วันนี้ทำงานหนักมาก 👏"
      rows = [
        { label: "🕕 เวลาออก", value: hhmm(d.timeISO) },
        { label: "⏱️ รวมเวลาทำงาน", value: `${Math.floor(wm / 60)} ชม ${wm % 60} นาที` },
      ]
      if (d.earlyOutMinutes && d.earlyOutMinutes > 0) rows.push({ label: "↩️ ออกก่อน", value: `${d.earlyOutMinutes} นาที` })
      if (d.locationName) rows.push({ label: "📍 สถานที่", value: d.locationName })
    }

    await autoSend(svc, { type: kind === "clock_in" ? "checkin" : "checkout", title, body, rows, headerColor: color },
      { employee_id: employeeId, name, feishu_open_id: fu.open_id ?? null, feishu_user_id: fu.feishu_user_id ?? null })
  } catch { /* เงียบ — ไม่ให้กระทบการเช็คอิน */ }
}
