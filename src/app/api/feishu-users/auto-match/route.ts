import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const ADMIN_ROLES = ["super_admin", "hr_admin"]

// POST /api/feishu-users/auto-match
//   body: { skip_verified?: boolean = true }
//   รัน auto-match ใหม่ทั้งหมด (ตามอัลกอใน import script)
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const { data: u } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!u || !ADMIN_ROLES.includes(u.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const skipVerified = body.skip_verified !== false

  // ── ดึง feishu_users ทั้งหมด ──
  let q = svc.from("feishu_users").select("feishu_user_id, name, name_en, nickname, email, email_work, email_business, phone, manually_verified, goodhr_employee_id")
  if (skipVerified) q = q.eq("manually_verified", false)
  const { data: feishuUsers } = await q

  // ── ดึง goodhr employees + sources ──
  const { data: emps } = await svc.from("employees")
    .select("id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, email, phone, feishu_user_id")
  const byFeishuId = new Map<string, any>()
  const byEmail = new Map<string, any>()
  const byNickEn = new Map<string, any>()
  const byNickTh = new Map<string, any>()
  const byFirstNameEn = new Map<string, any>()
  const byPhone = new Map<string, any>()

  // ── Normalize phone: ตัด space/dash/+ และ prefix country code ──
  //    +66863589646 → 0863589646
  //    086-358-9646 → 0863589646
  //    +8613580261303 → 13580261303 (จีน)
  const normPhone = (p: string | null | undefined): string => {
    if (!p) return ""
    const s = String(p).replace(/[\s\-()]/g, "")
    return s.replace(/^\+?66/, "0").replace(/^\+?86/, "")
  }

  for (const e of (emps ?? [])) {
    if (e.feishu_user_id) byFeishuId.set(e.feishu_user_id, e)
    if (e.email)        byEmail.set(e.email.trim().toLowerCase(), e)
    if (e.nickname_en)  byNickEn.set(e.nickname_en.trim().toLowerCase(), e)
    if (e.nickname)     byNickTh.set(e.nickname.trim().toLowerCase(), e)
    if (e.first_name_en) byFirstNameEn.set(e.first_name_en.trim().toLowerCase(), e)
    const ph = normPhone(e.phone)
    if (ph && ph.length >= 8) byPhone.set(ph, e)
  }

  const updates: Array<{ feishu_user_id: string; goodhr_employee_id: string; method: string; confidence: number }> = []
  let m_email = 0, m_phone = 0, m_nick_en = 0, m_nick_th = 0, m_name_en = 0, m_existing = 0, m_none = 0

  for (const r of (feishuUsers ?? [])) {
    let match: any = null, method = "", confidence = 0
    // 1. existing
    if (byFeishuId.has(r.feishu_user_id)) {
      match = byFeishuId.get(r.feishu_user_id); method = "code"; confidence = 100; m_existing++
    }
    // 2. email
    else if (r.email && byEmail.has(r.email.toLowerCase())) {
      match = byEmail.get(r.email.toLowerCase()); method = "email"; confidence = 95; m_email++
    }
    else if (r.email_work && byEmail.has(r.email_work.toLowerCase())) {
      match = byEmail.get(r.email_work.toLowerCase()); method = "email"; confidence = 95; m_email++
    }
    else if (r.email_business && byEmail.has(r.email_business.toLowerCase())) {
      match = byEmail.get(r.email_business.toLowerCase()); method = "email"; confidence = 92; m_email++
    }
    // 3. phone (ระดับความน่าเชื่อถือสูง — เบอร์เฉพาะตัวเอง)
    else if (r.phone) {
      const p = normPhone(r.phone)
      if (p && p.length >= 8 && byPhone.has(p)) {
        match = byPhone.get(p); method = "phone"; confidence = 93; m_phone++
      }
    }
    // 4. nickname
    if (!match && r.nickname) {
      const nk = r.nickname.toLowerCase()
      if (byNickEn.has(nk)) { match = byNickEn.get(nk); method = "nickname"; confidence = 88; m_nick_en++ }
      else if (byNickTh.has(nk)) { match = byNickTh.get(nk); method = "nickname"; confidence = 75; m_nick_th++ }
    }
    // 5. name_en
    if (!match && r.name_en) {
      const ne = r.name_en.toLowerCase()
      if (byFirstNameEn.has(ne)) { match = byFirstNameEn.get(ne); method = "name_en"; confidence = 70; m_name_en++ }
      else if (byNickEn.has(ne)) { match = byNickEn.get(ne); method = "name_en"; confidence = 78; m_name_en++ }
    }

    if (match) {
      updates.push({
        feishu_user_id: r.feishu_user_id,
        goodhr_employee_id: match.id,
        method, confidence,
      })
    } else {
      m_none++
    }
  }

  // ── update ทีละ batch 50 ──
  let ok = 0, fail = 0
  for (let i = 0; i < updates.length; i += 50) {
    const slice = updates.slice(i, i + 50)
    for (const u of slice) {
      const { error } = await svc.from("feishu_users").update({
        goodhr_employee_id: u.goodhr_employee_id,
        match_method: u.method,
        match_confidence: u.confidence,
        matched_at: new Date().toISOString(),
      }).eq("feishu_user_id", u.feishu_user_id)
        .eq("manually_verified", false)
      if (error) fail++
      else ok++
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      processed: feishuUsers?.length ?? 0,
      matched: { email: m_email, phone: m_phone, nickname_en: m_nick_en, nickname_th: m_nick_th, name_en: m_name_en, existing: m_existing },
      unmatched: m_none,
      updated: ok,
      failed: fail,
    },
  })
}
