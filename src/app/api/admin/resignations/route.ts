import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// Admin resignation requests (service-role — bypass RLS)
//   แก้ปัญหา "พนักงานกดลาออกแล้วไม่มาที่ HR": หน้าแอดมินเดิมอ่านผ่าน browser
//   client ที่ติด RLS (scope ตามบริษัท) → super_admin เห็นข้ามบริษัทไม่ได้
//
//   scope: super_admin → ทุกบริษัท (หรือกรองด้วย ?company_id)
//          hr_admin    → เฉพาะบริษัทตัวเอง
//   GET                → list (?status=..., ?company_id=...)
//   GET ?counts=1      → { pending_intent, pending_manager, pending_hr, total }
//   POST {action}      → intent_approve | intent_reject | approve | reject
// ════════════════════════════════════════════════════════════════════

async function getAdminCtx(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role, employee_id, company_id").eq("id", user.id).single()
  if (!dbUser) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) }
  if (!["hr_admin", "super_admin"].includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  const isSuper = dbUser.role === "super_admin"
  return { svc, dbUser, isSuper }
}

// จำกัด query ตาม scope บริษัท
function scoped(q: any, ctx: any, reqCompanyId?: string | null) {
  if (ctx.isSuper) {
    if (reqCompanyId) return q.eq("company_id", reqCompanyId)
    return q                       // super_admin ไม่เลือกบริษัท → ทุกบริษัท
  }
  return q.eq("company_id", ctx.dbUser.company_id)   // hr_admin → บริษัทตัวเอง
}

export async function GET(req: NextRequest) {
  const ctx = await getAdminCtx(req)
  if ((ctx as any).error) return (ctx as any).error
  const sp = req.nextUrl.searchParams
  const companyId = sp.get("company_id") || null
  const svc = (ctx as any).svc

  // counts สำหรับ badge
  if (sp.get("counts")) {
    const countFor = async (status: string) => {
      const { count } = await scoped(
        svc.from("resignation_requests").select("id", { count: "exact", head: true }),
        ctx, companyId,
      ).eq("status", status)
      return count ?? 0
    }
    const [pi, pm, ph] = await Promise.all([
      countFor("pending_intent"), countFor("pending_manager"), countFor("pending_hr"),
    ])
    return NextResponse.json({ pending_intent: pi, pending_manager: pm, pending_hr: ph, total: pi + pm + ph })
  }

  const status = sp.get("status") || ""
  let q = scoped(
    svc.from("resignation_requests").select(`*, employee:employees!resignation_requests_employee_id_fkey(
      id, first_name_th, last_name_th, employee_code, avatar_url, hire_date,
      position:positions(name), department:departments(name), company:companies(name_th, code))`),
    ctx, companyId,
  ).order("created_at", { ascending: false })
  if (status) q = q.eq("status", status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminCtx(req)
  if ((ctx as any).error) return (ctx as any).error
  const { svc, dbUser, isSuper } = ctx as any
  const body = await req.json()
  const { id, action, note } = body as { id: string; action: string; note?: string }
  if (!id || !action) return NextResponse.json({ error: "id และ action จำเป็น" }, { status: 400 })

  const { data: item } = await svc.from("resignation_requests")
    .select("*, employee:employees!resignation_requests_employee_id_fkey(first_name_th, last_name_th)")
    .eq("id", id).single()
  if (!item) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 })
  // scope check
  if (!isSuper && item.company_id !== dbUser.company_id) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการคำขอของบริษัทอื่น" }, { status: 403 })
  }

  const now = new Date().toISOString()
  const notify = async (title: string, bodyText: string) => {
    try { await svc.from("notifications").insert({ employee_id: item.employee_id, type: "resignation", title, body: bodyText }) } catch {}
  }

  // ── HR เปิดสิทธิ์ให้ลาออก (intent) ──
  if (action === "intent_approve" || action === "intent_reject") {
    if (item.status !== "pending_intent") return NextResponse.json({ error: "คำขอนี้ไม่ได้อยู่ในสถานะรอเปิดสิทธิ์" }, { status: 400 })
    const approved = action === "intent_approve"
    const { error } = await svc.from("resignation_requests").update({
      status: approved ? "intent_approved" : "rejected",
      hr_id: dbUser.employee_id,
      intent_approved_at: approved ? now : null,
      hr_note: note || null,
    }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await notify(
      approved ? "HR เปิดสิทธิ์ให้ลาออกแล้ว" : "คำขอลาออกถูกปฏิเสธ",
      approved ? "กรุณากรอกแบบฟอร์มลาออกในระบบ" : (note || ""),
    )
    return NextResponse.json({ success: true })
  }

  // ── HR ปิดสิทธิ์ (ยกเลิกการเปิดสิทธิ์) → กลับไปสถานะรอเปิดสิทธิ์ ──
  if (action === "intent_revoke") {
    if (item.status !== "intent_approved") return NextResponse.json({ error: "คำขอนี้ไม่ได้อยู่ในสถานะเปิดสิทธิ์แล้ว" }, { status: 400 })
    const { error } = await svc.from("resignation_requests").update({
      status: "pending_intent",
      intent_approved_at: null,
      hr_note: note || null,
    }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await notify("HR ปิดสิทธิ์การลาออก", note || "สิทธิ์การกรอกแบบฟอร์มลาออกถูกยกเลิก")
    return NextResponse.json({ success: true })
  }

  // ── HR อนุมัติ/ปฏิเสธ ใบลาออก (final) ──
  if (action === "approve" || action === "reject") {
    const approved = action === "approve"
    const { error } = await svc.from("resignation_requests").update({
      status: approved ? "approved" : "rejected",
      hr_id: dbUser.employee_id,
      hr_approved_at: now,
      hr_note: note || null,
    }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (approved) {
      // ตั้งสถานะพนักงาน + resign_date + is_active (ให้ payroll ซ่อนคนลาออกได้ถูก)
      await svc.from("employees").update({
        employment_status: "resigned",
        resign_date: item.effective_date || item.last_work_date || now.slice(0, 10),
        is_active: false,
      }).eq("id", item.employee_id)
    }
    await notify(
      approved ? "ใบลาออกได้รับการอนุมัติแล้ว" : "ใบลาออกถูกปฏิเสธโดย HR",
      note || "",
    )
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 })
}
