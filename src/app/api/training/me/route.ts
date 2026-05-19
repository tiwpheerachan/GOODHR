import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess } from "@/lib/utils/training-permissions"

// GET /api/training/me — คืนสิทธิ์ training ของ user ปัจจุบัน
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  return NextResponse.json({
    can_manage: access.isTrainingAdmin || access.isSupervisor,
    is_training_admin: access.isTrainingAdmin,
    is_supervisor: access.isSupervisor,
    is_base_admin: access.isBaseAdmin,
    supervisor_channel_ids: access.supervisorChannelIds,
  })
}
