// ════════════════════════════════════════════════════════════════════
// Training Permissions Helper
// ════════════════════════════════════════════════════════════════════
// แยก permission ออกจาก base user_role
//
// Roles:
//   - "training_admin"      → full LMS admin (CRUD ทุกอย่าง)
//   - "training_supervisor" → จัดการเฉพาะ channel ที่ตัวเองสร้าง/ถูกมอบ
//
// Super admin / hr_admin → มีสิทธิ์ทุกอย่างโดยปริยาย (ไม่ต้องอยู่ในตาราง)
// ════════════════════════════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js"

export type TrainingRole = "training_admin" | "training_supervisor"

export type TrainingPermission = {
  id: string
  employee_id: string
  role: TrainingRole
  channel_id: string | null
  granted_by: string | null
  granted_at: string
}

/**
 * เช็คว่า user ตอนนี้มีสิทธิ์ training admin/supervisor ไหม
 * @returns { isAdmin, isSupervisor, channelIds (ที่ supervisor มีสิทธิ์), permissions }
 */
export async function getTrainingAccess(
  svc: SupabaseClient,
  userId: string,
): Promise<{
  isBaseAdmin: boolean      // super_admin หรือ hr_admin (เห็นหมด)
  isTrainingAdmin: boolean
  isSupervisor: boolean
  supervisorChannelIds: string[]
  employeeId: string | null
  companyId: string | null
}> {
  const { data: dbUser } = await svc
    .from("users")
    .select("role, employee_id, employees(company_id)")
    .eq("id", userId)
    .single()

  if (!dbUser) {
    return {
      isBaseAdmin: false,
      isTrainingAdmin: false,
      isSupervisor: false,
      supervisorChannelIds: [],
      employeeId: null,
      companyId: null,
    }
  }

  const isBaseAdmin = ["super_admin", "hr_admin"].includes(dbUser.role)
  const employeeId = dbUser.employee_id ?? null
  const companyId = (dbUser.employees as any)?.company_id ?? null

  if (!employeeId) {
    return { isBaseAdmin, isTrainingAdmin: isBaseAdmin, isSupervisor: false, supervisorChannelIds: [], employeeId: null, companyId }
  }

  const { data: perms } = await svc
    .from("training_permissions")
    .select("role, channel_id")
    .eq("employee_id", employeeId)

  const isTrainingAdmin = isBaseAdmin || (perms ?? []).some((p: any) => p.role === "training_admin")
  const supervisorRows = (perms ?? []).filter((p: any) => p.role === "training_supervisor")
  const supervisorChannelIds = supervisorRows
    .map((p: any) => p.channel_id)
    .filter((id: string | null): id is string => !!id)
  const isSupervisor = supervisorRows.length > 0

  return { isBaseAdmin, isTrainingAdmin, isSupervisor, supervisorChannelIds, employeeId, companyId }
}

/**
 * แค่ guard สำหรับ API — throw 403 ถ้าไม่มีสิทธิ์ admin
 */
export async function requireTrainingAdmin(svc: SupabaseClient, userId: string) {
  const access = await getTrainingAccess(svc, userId)
  if (!access.isTrainingAdmin && !access.isSupervisor) {
    return { ok: false as const, error: "ไม่มีสิทธิ์เข้าถึงระบบ Training", access }
  }
  return { ok: true as const, access }
}

/**
 * เช็คว่า user มีสิทธิ์ใน channel นี้ไหม (admin ทุก channel, supervisor เฉพาะของตัวเอง)
 */
export function canManageChannel(
  access: Awaited<ReturnType<typeof getTrainingAccess>>,
  channelId: string | null,
): boolean {
  if (!channelId) return access.isTrainingAdmin
  if (access.isTrainingAdmin) return true
  return access.supervisorChannelIds.includes(channelId)
}
