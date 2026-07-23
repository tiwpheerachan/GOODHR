import { NextRequest, NextResponse } from "next/server"
import { notifGuard } from "@/lib/notif-admin"

// GET  — list config การ์ดแจ้งเตือนทุกชนิด
// PUT  — upsert config (key + fields)
export async function GET(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const { data, error } = await g.svc.from("notification_templates").select("*").order("sort_order")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

export async function PUT(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const body = await req.json().catch(() => null)
  if (!body?.key) return NextResponse.json({ error: "ต้องระบุ key" }, { status: 400 })
  const patch: any = { key: body.key, updated_at: new Date().toISOString(), updated_by: g.userId }
  for (const f of ["name", "category", "enabled", "header_color", "title_tmpl", "body_tmpl", "sort_order"]) {
    if (body[f] !== undefined) patch[f] = body[f]
  }
  const { data, error } = await g.svc.from("notification_templates").upsert(patch, { onConflict: "key" }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}
