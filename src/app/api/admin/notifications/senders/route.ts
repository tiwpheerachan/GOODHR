import { NextRequest, NextResponse } from "next/server"
import { notifGuard } from "@/lib/notif-admin"

// GET — list allowlist ผู้ส่ง (join employees)
export async function GET(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const { data, error } = await g.svc.from("notification_senders")
    .select("id, employee_id, created_at, employee:employees!notification_senders_employee_id_fkey(employee_code, first_name_th, last_name_th, nickname, avatar_url, department:departments(name), position:positions(name))")
    .order("created_at", { ascending: false })
  if (error) {
    // เผื่อ FK ยังไม่ถูก infer → fallback ไม่ join
    const { data: d2 } = await g.svc.from("notification_senders").select("id, employee_id, created_at").order("created_at", { ascending: false })
    const ids = (d2 ?? []).map((r: any) => r.employee_id)
    const emap = new Map<string, any>()
    if (ids.length) {
      const { data: emps } = await g.svc.from("employees").select("id, employee_code, first_name_th, last_name_th, nickname, avatar_url, department:departments(name), position:positions(name)").in("id", ids)
      for (const e of emps ?? []) emap.set(e.id, e)
    }
    return NextResponse.json({ senders: (d2 ?? []).map((r: any) => ({ ...r, employee: emap.get(r.employee_id) ?? null })) })
  }
  return NextResponse.json({ senders: data ?? [] })
}

// POST — เพิ่มผู้ส่ง (employee_id หรือ employee_ids[])
export async function POST(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const body = await req.json().catch(() => null)
  const ids: string[] = body?.employee_ids || (body?.employee_id ? [body.employee_id] : [])
  if (!ids.length) return NextResponse.json({ error: "ต้องระบุ employee_id" }, { status: 400 })
  const rows = ids.map((id) => ({ employee_id: id, added_by: g.userId }))
  const { error } = await g.svc.from("notification_senders").upsert(rows, { onConflict: "employee_id", ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, added: ids.length })
}

// DELETE ?id= — ลบผู้ส่งออกจาก allowlist
export async function DELETE(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ต้องระบุ id" }, { status: 400 })
  const { error } = await g.svc.from("notification_senders").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
