import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, resolveEmp, recipient, empName, EMP_FIELDS } from "@/lib/feishu-notify"
import { enabledRecipientSet } from "@/lib/notif-rollout"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/resolve?employee_id=|feishu_user_id=|email=
//   ตัวช่วย map ตัวตน: คืน employee + role + หัวหน้าปัจจุบัน (glue สำหรับ bot)
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams

  const emp = await resolveEmp(s, {
    employee_id: p.get("employee_id"),
    feishu_user_id: p.get("feishu_user_id"),
    email: p.get("email"),
  })

  // ── debug log ชั่วคราว: ดักว่าบอทเรียก resolve จริงไหม + ส่ง id อะไรมา ──
  try {
    await s.from("notification_send_log").insert({
      type: "_resolve_debug",
      title: `resolve ${emp ? "OK" : "NOT_FOUND"}`,
      recipient_feishu_id: p.get("feishu_user_id") || p.get("employee_id") || p.get("email") || "(none)",
      recipient_name: emp ? empName(emp) : null,
      status: emp ? "sent" : "failed",
      sent_by_name: "bot-call",
      meta: { emp_id: p.get("employee_id"), feishu: p.get("feishu_user_id"), email: p.get("email"), ua: req.headers.get("user-agent") },
    })
  } catch { /* เงียบ */ }

  if (!emp) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })

  // role (จาก users)
  const { data: u } = await s.from("users").select("role").eq("employee_id", emp.id).maybeSingle()

  // หัวหน้าปัจจุบัน
  const { data: mh } = await s.from("employee_manager_history")
    .select("manager_id").eq("employee_id", emp.id).is("effective_to", null).limit(1).maybeSingle()
  let manager: any = null
  if (mh?.manager_id) {
    const { data: mEmp } = await s.from("employees").select(EMP_FIELDS).eq("id", mh.manager_id).maybeSingle()
    if (mEmp) manager = recipient(mEmp as any)
  }

  // เป็นหัวหน้าของกี่คน (ลูกทีมปัจจุบัน)
  const { count: teamCount } = await s.from("employee_manager_history")
    .select("employee_id", { count: "exact", head: true })
    .eq("manager_id", emp.id).is("effective_to", null)

  // เปิดสิทธิ์รับแจ้งเตือน (rollout) ไหม → บอทใช้ตัดสินใจก่อนส่ง (โดยเฉพาะ webhook)
  const enabled = await enabledRecipientSet(s, [emp.id])
  const notify_enabled = enabled.has(emp.id)

  return NextResponse.json({
    employee: recipient(emp),
    display_name: empName(emp),
    role: u?.role ?? "employee",
    is_manager: (teamCount ?? 0) > 0,
    team_size: teamCount ?? 0,
    notify_enabled,     // ⛔ false = ยังไม่เปิดสิทธิ์รับ → bot ไม่ควรส่ง
    manager,
  })
}
