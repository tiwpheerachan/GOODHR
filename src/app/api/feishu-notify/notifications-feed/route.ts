import { NextRequest, NextResponse } from "next/server"
import { checkBotAuth, svc, EMP_FIELDS, recipient, chunk, type EmpLite } from "@/lib/feishu-notify"
import { filterEnabled } from "@/lib/notif-rollout"

// ════════════════════════════════════════════════════════════════════
// GET /api/feishu-notify/notifications-feed?since=ISO&company_id=&limit=&types=
//   BACKBONE: คืน in-app notification ที่ "เกิดใหม่" (created_at ≥ since)
//   พร้อม feishu_user_id ของผู้รับ → bot เอาไป relay เป็น DM ได้ทันที
//   ครอบคลุมทุกเหตุการณ์ที่แอปเขียน notification อยู่แล้ว (อนุมัติลา/OT/ลาออก/
//   KPI/ทดลองงาน/อบรม/เบิกอุปกรณ์/ประเมินสาขา/เปลี่ยนหัวหน้า ฯลฯ)
//   • bot จำ since (max created_at ที่ได้รับ) เองแบบเดียวกับ /events
//   • ตาราง notifications มี 2 คอลัมน์ผู้รับ (employee_id|recipient_id) + 2 ข้อความ (body|message) → normalize
//   ⚠️ ไม่คืนข้อมูลเงินเดือน
// ════════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = checkBotAuth(req); if (auth) return auth
  const s = svc()
  const p = req.nextUrl.searchParams
  const companyId = p.get("company_id")
  const limit = Math.min(Math.max(parseInt(p.get("limit") || "200") || 200, 1), 1000)
  // default: 15 นาทีล่าสุด (เผื่อ bot รันทุก ~5-10 นาที)
  const since = p.get("since") || new Date(Date.now() - 15 * 60_000).toISOString()
  const typeFilter = (p.get("types") || "").split(",").map((x) => x.trim()).filter(Boolean)

  let q = s.from("notifications").select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(limit)
  if (typeFilter.length) q = q.in("type", typeFilter)
  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const notis = (rows ?? []) as any[]
  if (notis.length === 0) {
    return NextResponse.json({ since, count: 0, latest: since, notifications: [] })
  }

  // recipient = employee_id ?? recipient_id ; ดึง feishu_user_id
  const recIds = Array.from(new Set(notis.map((n) => n.employee_id || n.recipient_id).filter(Boolean)))
  const empMap = new Map<string, EmpLite>()
  for (const c of chunk(recIds as string[], 300)) {
    let eq = s.from("employees").select(EMP_FIELDS).in("id", c)
    if (companyId) eq = eq.eq("company_id", companyId)
    const { data } = await eq
    for (const e of (data ?? []) as unknown as EmpLite[]) empMap.set(e.id, e)
  }

  const out = notis
    .map((n) => {
      const rid = n.employee_id || n.recipient_id
      const emp = rid ? empMap.get(rid) : undefined
      // ถ้าระบุ company_id แล้ว recipient ไม่อยู่บริษัทนั้น → ตัดออก
      if (companyId && !emp) return null
      return {
        id: n.id,
        type: n.type,
        title: n.title ?? null,
        text: n.body ?? n.message ?? null,
        ref_table: n.ref_table ?? null,
        ref_id: n.ref_id ?? null,
        is_read: n.is_read ?? false,
        created_at: n.created_at,
        recipient: emp
          ? recipient(emp)
          : { employee_id: rid ?? null, feishu_user_id: null, name: null },
      }
    })
    .filter(Boolean) as any[]

  const latest = notis[notis.length - 1].created_at || since
  const gatedOut = p.get("rollout") !== "0" ? await filterEnabled(s, out, (n: any) => n.recipient?.employee_id) : out
  return NextResponse.json({
    since,
    count: gatedOut.length,
    latest,                // ← bot ใช้เป็น since ของรอบถัดไป
    notifications: gatedOut,   // เฉพาะคนที่เปิดสิทธิ์รับ (rollout)
  })
}
