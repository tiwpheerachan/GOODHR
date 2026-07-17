import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// GET — รายชื่อบริษัท (สำหรับ filter ใน dashboard/บันทึก) — admin/supervisor
export async function GET(_req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ companies: [] })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.isEvalAdmin && !access.isSupervisor) return NextResponse.json({ companies: [] })
  const { data } = await svc.from("companies").select("id, name_th, code").order("name_th")
  return NextResponse.json({ companies: data ?? [] })
}
