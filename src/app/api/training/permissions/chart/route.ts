import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, getViewerSubordinateIds } from "@/lib/utils/training-permissions"

// GET /api/training/permissions/chart
// คืนข้อมูลสิทธิ์แบบ tree สำหรับวาดผัง:
//   channels[]
//     ├─ training_admins[]   (global — เห็นในทุก channel)
//     ├─ supervisors[]       (ของ channel นี้ — full CRUD)
//     └─ viewers[]
//          ├─ scope: all          → เห็นทุกคนในช่อง
//          └─ scope: subordinates → expand subordinate_employees[] ได้
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isBaseAdmin && !access.isTrainingAdmin && !access.isSupervisor) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  // ── load channels (scope by access — admin/supervisor of channel sees their channels) ──
  let chQ = svc.from("training_channels")
    .select("id, name, brand, thumbnail_url, description")
    .eq("is_active", true)
    .order("name")
  if (!access.isBaseAdmin && !access.isTrainingAdmin) {
    chQ = chQ.in("id", access.supervisorChannelIds.length > 0
      ? access.supervisorChannelIds
      : ["00000000-0000-0000-0000-000000000000"])
  }
  const { data: channels } = await chQ

  // ── all permissions joined with employee profile ──
  const { data: perms } = await svc
    .from("training_permissions")
    .select(`id, role, scope, channel_id, granted_at,
             employee:employees!training_permissions_employee_id_fkey(
               id, first_name_th, last_name_th, nickname, employee_code, avatar_url,
               position:positions(name), department:departments(name)
             )`)
    .order("granted_at", { ascending: false })

  const allPerms = (perms ?? []) as any[]

  // Training admins (channel_id IS NULL) — global
  const trainingAdmins = allPerms.filter(p => p.role === "training_admin" && p.employee)

  // ── build per-channel summary + subordinate lists ──
  const result = []
  for (const ch of channels ?? []) {
    const supervisors = allPerms.filter(p => p.role === "training_supervisor" && p.channel_id === ch.id && p.employee)
    const viewers = allPerms.filter(p => p.role === "training_viewer" && p.channel_id === ch.id && p.employee)

    // For viewers with scope='subordinates', resolve explicit list from training_viewer_subordinates
    const viewersResolved = await Promise.all(viewers.map(async (v: any) => {
      let subordinates: any[] = []
      if (v.scope === "subordinates") {
        const subIds = await getViewerSubordinateIds(svc, v.id)
        if (subIds.length > 0) {
          const { data: emps } = await svc.from("employees")
            .select(`id, first_name_th, last_name_th, nickname, employee_code, avatar_url,
                     position:positions(name), department:departments(name)`)
            .in("id", subIds)
            .order("first_name_th")
          subordinates = emps ?? []
        }
      }
      return { ...v, subordinates }
    }))

    // Enrollment count for the channel (to show "เห็น N / M คน")
    const { data: courses } = await svc.from("training_courses")
      .select("id").eq("channel_id", ch.id).is("deleted_at", null)
    const courseIds = (courses ?? []).map(c => c.id)
    let totalLearners = 0
    if (courseIds.length > 0) {
      const { count } = await svc.from("training_enrollments")
        .select("employee_id", { count: "exact", head: true })
        .in("course_id", courseIds)
      totalLearners = count ?? 0
    }

    result.push({
      channel: ch,
      supervisors,
      viewers: viewersResolved,
      stats: {
        course_count: courseIds.length,
        total_enrollments: totalLearners,
      },
    })
  }

  return NextResponse.json({
    training_admins: trainingAdmins,
    channels: result,
  })
}
