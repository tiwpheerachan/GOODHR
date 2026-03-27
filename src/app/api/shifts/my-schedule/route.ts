import { createServiceClient, createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET — พนักงานดูตารางกะของตัวเอง
export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const url = new URL(request.url)
  const month = url.searchParams.get("month") // format: 2026-03

  const { data: userData } = await supa
    .from("users")
    .select("employee_id")
    .eq("id", user.id)
    .single()

  if (!userData?.employee_id) return NextResponse.json({ success: false, error: "No employee" })

  const now = new Date()
  const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [yearStr, monthStr] = targetMonth.split("-")
  const year = parseInt(yearStr)
  const mon = parseInt(monthStr)

  // สร้างวันทั้งเดือน
  const days: string[] = []
  const d = new Date(year, mon - 1, 1)
  while (d.getMonth() === mon - 1) {
    days.push(d.toISOString().split("T")[0])
    d.setDate(d.getDate() + 1)
  }

  const startDate = days[0]
  const endDate = days[days.length - 1]

  // ดึง assignments
  const { data: assignments, error } = await supa
    .from("monthly_shift_assignments")
    .select("*, shift:shift_templates(id, name, shift_type, work_start, work_end)")
    .eq("employee_id", userData.employee_id)
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date")

  if (error) return NextResponse.json({ success: false, error: error.message })

  // ดึง profile + can_self_schedule
  const [{ data: profile }, { data: empData }] = await Promise.all([
    supa.from("employee_schedule_profiles")
      .select("*, default_shift:shift_templates(id, name, work_start, work_end)")
      .eq("employee_id", userData.employee_id)
      .maybeSingle(),
    supa.from("employees")
      .select("can_self_schedule")
      .eq("id", userData.employee_id)
      .maybeSingle(),
  ])

  // Map assignments by date
  const assignMap: Record<string, any> = {}
  for (const a of (assignments ?? [])) {
    assignMap[a.work_date] = a
  }

  const schedule = days.map(date => ({
    date,
    assignment: assignMap[date] ?? null,
  }))

  return NextResponse.json({
    success: true,
    month: targetMonth,
    days,
    schedule,
    profile,
    can_self_schedule: !!(empData as any)?.can_self_schedule,
  })
}
