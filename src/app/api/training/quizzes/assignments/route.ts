import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, canManageChannel } from "@/lib/utils/training-permissions"

// ════════════════════════════════════════════════════════════════════
// กำหนดผู้ทำควิซ (training_quiz_assignments)
//   GET  ?quiz_id=          → { assignees[], count }
//   GET  ?quiz_id=&q=text   → ค้นหาพนักงาน (ข้ามบริษัท) เพื่อเพิ่ม
//   POST { quiz_id, employee_ids[] } → กำหนดเพิ่ม
//   DELETE ?quiz_id=&employee_id=    → เอาออก
//   ควิซที่ไม่มี assignment = ทุกคนในคอร์สเห็น (default)
// ════════════════════════════════════════════════════════════════════

const EMP_SELECT = "id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, avatar_url, brand, company:companies(name_th), department:departments(name), position:positions(name)"

async function ctx() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  return { svc, access, user }
}

// ตรวจสิทธิ์จัดการควิซ (ผ่าน channel ของคอร์ส) + คืน quiz.course_id
async function quizAccess(svc: any, access: any, quizId: string) {
  const { data: q } = await svc.from("training_quizzes").select("id, course_id").eq("id", quizId).maybeSingle()
  if (!q) return { ok: false }
  const { data: course } = await svc.from("training_courses").select("channel_id").eq("id", q.course_id).maybeSingle()
  if (!course || !canManageChannel(access, course.channel_id)) return { ok: false }
  return { ok: true, quiz: q }
}

export async function GET(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  const quizId = req.nextUrl.searchParams.get("quiz_id")
  if (!quizId) return NextResponse.json({ error: "quiz_id จำเป็น" }, { status: 400 })
  const a = await quizAccess(svc, access, quizId)
  if (!a.ok) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const q = (req.nextUrl.searchParams.get("q") || "").trim()
  // โหมดค้นหาพนักงาน (ข้ามบริษัท)
  if (q) {
    const clean = q.replace(/[,()%]/g, " ").trim()
    const like = `%${clean}%`
    const { data } = await svc.from("employees").select(EMP_SELECT)
      .or([
        `first_name_th.ilike.${like}`, `last_name_th.ilike.${like}`, `first_name_en.ilike.${like}`,
        `last_name_en.ilike.${like}`, `nickname.ilike.${like}`, `employee_code.ilike.${like}`,
      ].join(","))
      .not("employment_status", "in", "(resigned,terminated)")
      .limit(12)
    return NextResponse.json({ results: data ?? [] })
  }

  // รายชื่อที่ถูกกำหนด
  const { data: rows } = await svc.from("training_quiz_assignments")
    .select("employee_id, created_at").eq("quiz_id", quizId).order("created_at")
  const ids = (rows ?? []).map((r: any) => r.employee_id)
  let assignees: any[] = []
  if (ids.length > 0) {
    const { data: emps } = await svc.from("employees").select(EMP_SELECT).in("id", ids)
    assignees = emps ?? []
  }
  return NextResponse.json({ count: assignees.length, assignees })
}

export async function POST(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access, user } = c
  const body = await req.json().catch(() => ({}))
  const quizId = (body?.quiz_id ?? "").toString()
  const empIds: string[] = Array.isArray(body?.employee_ids) ? body.employee_ids.filter(Boolean) : []
  if (!quizId || empIds.length === 0) return NextResponse.json({ error: "quiz_id / employee_ids จำเป็น" }, { status: 400 })
  const a = await quizAccess(svc, access, quizId)
  if (!a.ok) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const rows = empIds.map(eid => ({ quiz_id: quizId, employee_id: eid, assigned_by: user.id }))
  const { error } = await svc.from("training_quiz_assignments").upsert(rows, { onConflict: "quiz_id,employee_id" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const c = await ctx(); if (c.error) return c.error
  const { svc, access } = c
  const quizId = req.nextUrl.searchParams.get("quiz_id")
  const empId = req.nextUrl.searchParams.get("employee_id")
  if (!quizId || !empId) return NextResponse.json({ error: "quiz_id / employee_id จำเป็น" }, { status: 400 })
  const a = await quizAccess(svc, access, quizId)
  if (!a.ok) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  const { error } = await svc.from("training_quiz_assignments").delete().eq("quiz_id", quizId).eq("employee_id", empId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
