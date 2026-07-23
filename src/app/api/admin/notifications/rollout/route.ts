import { NextRequest, NextResponse } from "next/server"
import { notifGuard } from "@/lib/notif-admin"

const empName = (e: any) => `${e?.first_name_th || ""} ${e?.last_name_th || ""}${e?.nickname ? ` (${e.nickname})` : ""}`.trim() || e?.employee_code || "-"

// GET — สถานะ rollout: mode + รายชื่อ employee/department ที่เปิด + รายการแผนกทั้งหมด (ทำ checklist)
export async function GET(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const { data: rows } = await g.svc.from("notification_rollout").select("id, kind, ref_id")
  const list = rows ?? []
  const mode = list.some((r: any) => r.kind === "all") ? "all" : (list.length ? "pilot" : "none")

  const empRows = list.filter((r: any) => r.kind === "employee")
  const depRows = list.filter((r: any) => r.kind === "department")
  const empIds = empRows.map((r: any) => r.ref_id)

  const empMap = new Map<string, any>()
  if (empIds.length) {
    const { data } = await g.svc.from("employees").select("id, employee_code, first_name_th, last_name_th, nickname").in("id", empIds)
    for (const e of data ?? []) empMap.set(e.id, e)
  }
  const { data: allDeps } = await g.svc.from("departments").select("id, name").order("name")
  const enabledDepIds = new Set(depRows.map((r: any) => r.ref_id))

  return NextResponse.json({
    mode,
    employees: empRows.map((r: any) => ({ row_id: r.id, employee_id: r.ref_id, name: empName(empMap.get(r.ref_id)) })),
    departments: (allDeps ?? []).map((d: any) => {
      const row = depRows.find((r: any) => r.ref_id === d.id)
      return { department_id: d.id, name: d.name, enabled: enabledDepIds.has(d.id), row_id: row?.id ?? null }
    }),
  })
}

// PUT { mode: 'all' | 'pilot' } — เปิดทุกคน / กลับเป็นนำร่อง (ลบ row 'all')
export async function PUT(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const body = await req.json().catch(() => null)
  if (body?.mode === "all") {
    const { data: ex } = await g.svc.from("notification_rollout").select("id").eq("kind", "all").limit(1).maybeSingle()
    if (!ex) { const { error } = await g.svc.from("notification_rollout").insert({ kind: "all", ref_id: null, added_by: g.userId }); if (error) return NextResponse.json({ error: error.message }, { status: 500 }) }
  } else {
    await g.svc.from("notification_rollout").delete().eq("kind", "all")
  }
  return NextResponse.json({ ok: true })
}

// POST { employee_ids?: [], department_ids?: [] } — เพิ่มเข้าสิทธิ์รับ (dedupe เอง)
export async function POST(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const body = await req.json().catch(() => null)
  const want: { kind: string; ref_id: string }[] = []
  for (const id of body?.employee_ids || []) want.push({ kind: "employee", ref_id: id })
  for (const id of body?.department_ids || []) want.push({ kind: "department", ref_id: id })
  if (!want.length) return NextResponse.json({ error: "ไม่มีรายการ" }, { status: 400 })

  const { data: ex } = await g.svc.from("notification_rollout").select("kind, ref_id")
  const has = new Set((ex ?? []).map((r: any) => `${r.kind}:${r.ref_id}`))
  const fresh = want.filter((r) => !has.has(`${r.kind}:${r.ref_id}`)).map((r) => ({ ...r, added_by: g.userId }))
  if (fresh.length) {
    const { error } = await g.svc.from("notification_rollout").insert(fresh)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, added: fresh.length })
}

// DELETE ?id= (row id)  หรือ  ?kind=department&ref_id=  — เอาออกจากสิทธิ์รับ
export async function DELETE(req: NextRequest) {
  const g = await notifGuard(req); if ("error" in g) return g.error
  const p = req.nextUrl.searchParams
  const id = p.get("id")
  if (id) { await g.svc.from("notification_rollout").delete().eq("id", id); return NextResponse.json({ ok: true }) }
  const kind = p.get("kind"), ref = p.get("ref_id")
  if (kind && ref) { await g.svc.from("notification_rollout").delete().eq("kind", kind).eq("ref_id", ref); return NextResponse.json({ ok: true }) }
  return NextResponse.json({ error: "ต้องระบุ id หรือ kind+ref_id" }, { status: 400 })
}
