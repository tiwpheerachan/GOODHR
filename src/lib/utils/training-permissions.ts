// ════════════════════════════════════════════════════════════════════
// Training Permissions Helper
// ════════════════════════════════════════════════════════════════════
// Roles:
//   - "training_admin"      → full LMS admin (CRUD ทุกอย่าง)
//   - "training_supervisor" → จัดการเฉพาะ channel ที่ได้รับมอบ (full CRUD)
//   - "training_viewer"     → อ่านอย่างเดียว + download ได้, scope จำกัด
//
// Super admin / hr_admin → มีสิทธิ์ทุกอย่างโดยปริยาย
// ════════════════════════════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js"

export type TrainingRole = "training_admin" | "training_supervisor" | "training_viewer"
export type ViewerScope = "all" | "subordinates"

export type TrainingPermission = {
  id: string
  employee_id: string
  role: TrainingRole
  channel_id: string | null
  scope?: ViewerScope | null
  granted_by: string | null
  granted_at: string
}

export type ViewerChannel = { channel_id: string; scope: ViewerScope }

export type ViewerChannelWithPerm = ViewerChannel & { permission_id: string }

export type TrainingAccess = {
  role: string | null                          // raw users.role — เผื่อใช้แยก super_admin จาก hr_admin
  isSuperAdmin: boolean
  isBaseAdmin: boolean
  isTrainingAdmin: boolean
  isSupervisor: boolean
  isViewer: boolean
  supervisorChannelIds: string[]              // full CRUD channels
  viewerChannels: ViewerChannelWithPerm[]     // read-only channels (filtered by scope)
  employeeId: string | null
  companyId: string | null
}

export async function getTrainingAccess(
  svc: SupabaseClient,
  userId: string,
): Promise<TrainingAccess> {
  const { data: dbUser } = await svc
    .from("users")
    .select("role, employee_id, employees(company_id)")
    .eq("id", userId)
    .single()

  if (!dbUser) {
    return {
      role: null, isSuperAdmin: false,
      isBaseAdmin: false, isTrainingAdmin: false, isSupervisor: false, isViewer: false,
      supervisorChannelIds: [], viewerChannels: [], employeeId: null, companyId: null,
    }
  }

  const role = dbUser.role ?? null
  const isSuperAdmin = role === "super_admin"
  const isBaseAdmin = ["super_admin", "hr_admin"].includes(dbUser.role)
  const employeeId = dbUser.employee_id ?? null
  const companyId = (dbUser.employees as any)?.company_id ?? null

  if (!employeeId) {
    return {
      role, isSuperAdmin,
      isBaseAdmin, isTrainingAdmin: isBaseAdmin, isSupervisor: false, isViewer: false,
      supervisorChannelIds: [], viewerChannels: [], employeeId: null, companyId,
    }
  }

  const { data: perms } = await svc
    .from("training_permissions")
    .select("id, role, channel_id, scope")
    .eq("employee_id", employeeId)

  const list = (perms ?? []) as any[]
  const isTrainingAdmin = isBaseAdmin || list.some(p => p.role === "training_admin")

  const supervisorChannelIds = list
    .filter(p => p.role === "training_supervisor" && p.channel_id)
    .map(p => p.channel_id as string)

  // viewer channels — drop any that the user also has supervisor/admin on (higher role wins)
  const viewerChannels: ViewerChannelWithPerm[] = list
    .filter(p =>
      p.role === "training_viewer" &&
      p.channel_id &&
      !supervisorChannelIds.includes(p.channel_id) &&
      !isTrainingAdmin,
    )
    .map(p => ({
      channel_id: p.channel_id as string,
      scope: (p.scope as ViewerScope) ?? "subordinates",
      permission_id: p.id as string,
    }))

  return {
    role, isSuperAdmin,
    isBaseAdmin, isTrainingAdmin,
    isSupervisor: supervisorChannelIds.length > 0,
    isViewer: viewerChannels.length > 0,
    supervisorChannelIds, viewerChannels,
    employeeId, companyId,
  }
}

export async function requireTrainingAdmin(svc: SupabaseClient, userId: string) {
  const access = await getTrainingAccess(svc, userId)
  if (!access.isTrainingAdmin && !access.isSupervisor && !access.isViewer) {
    return { ok: false as const, error: "ไม่มีสิทธิ์เข้าถึงระบบ Training", access }
  }
  return { ok: true as const, access }
}

/** Write access — admin หรือ supervisor ของ channel นี้ (viewer ไม่นับ) */
export function canManageChannel(access: TrainingAccess, channelId: string | null): boolean {
  if (!channelId) return access.isTrainingAdmin
  if (access.isTrainingAdmin) return true
  return access.supervisorChannelIds.includes(channelId)
}

/** Read access — admin, supervisor, OR viewer ของ channel นี้ */
export function canViewChannel(access: TrainingAccess, channelId: string | null): boolean {
  if (!channelId) return access.isTrainingAdmin
  if (canManageChannel(access, channelId)) return true
  return access.viewerChannels.some(v => v.channel_id === channelId)
}

/** Viewer ของ channel นี้มี scope แบบไหน — ถ้าไม่ใช่ viewer คืน null */
export function getViewerScope(access: TrainingAccess, channelId: string): ViewerScope | null {
  const v = access.viewerChannels.find(v => v.channel_id === channelId)
  return v?.scope ?? null
}

/** ทุก channel ที่ user เข้าถึงได้ (รวม manage + view) */
export function getAccessibleChannelIds(access: TrainingAccess): string[] | "ALL" {
  if (access.isTrainingAdmin) return "ALL"
  const ids = new Set<string>([
    ...access.supervisorChannelIds,
    ...access.viewerChannels.map(v => v.channel_id),
  ])
  return Array.from(ids)
}

/**
 * ดึง learner_employee_id ที่ผูกกับ viewer permission_id นี้ (explicit list)
 * ไม่ recursive ตาม supervisor_id — แต่อ่านจากตาราง training_viewer_subordinates
 */
export async function getViewerSubordinateIds(
  svc: SupabaseClient, permissionId: string,
): Promise<string[]> {
  const { data, error } = await svc
    .from("training_viewer_subordinates")
    .select("learner_employee_id")
    .eq("permission_id", permissionId)
  if (error || !data) return []
  return (data as any[]).map(r => r.learner_employee_id).filter(Boolean)
}

/**
 * ตรวจสอบสิทธิ์ READ enrollments ของ channel หนึ่ง:
 * - ถ้า manage ได้ → คืน { allowed: true, filterEmployeeIds: null } (ดูทุกคน)
 * - ถ้าเป็น viewer scope=all → { allowed: true, filterEmployeeIds: null }
 * - ถ้าเป็น viewer scope=subordinates → { allowed: true, filterEmployeeIds: [ids] }
 *     (ดึงจาก explicit list — ถ้ายังไม่ assign จะเห็น 0 คน)
 * - ถ้าไม่มีสิทธิ์ → { allowed: false }
 */
export async function getChannelReadFilter(
  svc: SupabaseClient, access: TrainingAccess, channelId: string,
): Promise<{ allowed: boolean; filterEmployeeIds: string[] | null }> {
  if (canManageChannel(access, channelId)) return { allowed: true, filterEmployeeIds: null }
  const viewer = access.viewerChannels.find(v => v.channel_id === channelId)
  if (!viewer) return { allowed: false, filterEmployeeIds: null }
  if (viewer.scope === "all") return { allowed: true, filterEmployeeIds: null }
  // scope === 'subordinates' — read explicit list
  const ids = await getViewerSubordinateIds(svc, viewer.permission_id)
  return { allowed: true, filterEmployeeIds: ids }
}
