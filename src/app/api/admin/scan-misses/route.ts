import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// scan_misses — บาร์โค้ด/ซีเรียลที่สแกนแล้วไม่เจอสินค้า (สำหรับเติม master)
//   GET    ?type=barcode|serial&status=unresolved|resolved|all&q=&limit=
//   PATCH  { id, resolved?, note? }
//   DELETE ?id=...
// ════════════════════════════════════════════════════════════════════

async function getAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("id, role, employee_id").eq("id", user.id).single()
  if (!dbUser || !["hr_admin", "super_admin"].includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  return { svc, dbUser }
}

export async function GET(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc } = a
  const p = req.nextUrl.searchParams
  const type = p.get("type")            // barcode | serial | (all)
  const status = p.get("status") || "unresolved"
  const q = (p.get("q") || "").trim()
  const limit = Math.min(parseInt(p.get("limit") || "300"), 1000)

  let query = svc.from("scan_misses").select("*")
    .order("resolved", { ascending: true })
    .order("hits", { ascending: false })
    .order("last_seen", { ascending: false })
    .limit(limit)
  if (type === "barcode" || type === "serial") query = query.eq("scan_type", type)
  if (status === "unresolved") query = query.eq("resolved", false)
  else if (status === "resolved") query = query.eq("resolved", true)
  if (q) query = query.ilike("code_norm", `%${q.toUpperCase()}%`)

  const { data: rows, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const list = rows ?? []

  // แนบชื่อผู้สแกนล่าสุด
  const empIds = Array.from(new Set(list.map((r: any) => r.last_employee_id).filter(Boolean)))
  const empMap = new Map<string, any>()
  if (empIds.length > 0) {
    const { data: emps } = await svc.from("employees")
      .select("id, first_name_th, last_name_th, nickname, employee_code").in("id", empIds)
    for (const e of emps ?? []) empMap.set(e.id, e)
  }

  // สรุปยอด (จากทั้งหมด ไม่ติด filter)
  const { count: totalUnresolved } = await svc.from("scan_misses")
    .select("id", { count: "exact", head: true }).eq("resolved", false)

  const items = list.map((r: any) => {
    const e = r.last_employee_id ? empMap.get(r.last_employee_id) : null
    return {
      ...r,
      last_employee_name: e ? `${e.first_name_th ?? ""} ${e.last_name_th ?? ""}${e.nickname ? ` (${e.nickname})` : ""}`.trim() : null,
      last_employee_code: e?.employee_code ?? null,
    }
  })

  return NextResponse.json({ items, total_unresolved: totalUnresolved ?? 0 })
}

export async function PATCH(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc } = a
  const body = await req.json().catch(() => ({}))
  const id = (body?.id ?? "").toString()
  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })

  const update: any = {}
  if (typeof body.resolved === "boolean") {
    update.resolved = body.resolved
    update.resolved_at = body.resolved ? new Date().toISOString() : null
  }
  if (typeof body.note === "string") update.note = body.note.trim() || null
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "ไม่มีอะไรให้แก้" }, { status: 400 })

  const { error } = await svc.from("scan_misses").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc } = a
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })
  const { error } = await svc.from("scan_misses").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
