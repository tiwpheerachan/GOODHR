import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

const REACTIONS = ["like", "love", "laugh", "wow", "sad"] as const

// GET — list announcements with reactions
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee_id, employee:employees(company_id, department_id)")
    .eq("id", user.id).single()

  const isAdmin = userData?.role === "super_admin" || userData?.role === "hr_admin"
  const emp = userData?.employee as any
  const companyId = emp?.company_id
  const deptId = emp?.department_id
  const mode = req.nextUrl.searchParams.get("mode")

  // Base select with creator info
  const selectStr = "*, creator:employees!created_by(first_name_th, last_name_th, nickname, avatar_url), company:companies(code), department:departments(name)"

  let anns: any[] = []

  if (mode === "admin" && isAdmin) {
    const { data } = await supa.from("announcements").select(selectStr)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false }).limit(100)
    anns = data ?? []
  } else {
    const { data } = await supa.from("announcements").select(selectStr)
      .or(`company_id.is.null,company_id.eq.${companyId}`)
      .lte("published_at", new Date().toISOString())
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false }).limit(50)

    anns = (data ?? []).filter((a: any) =>
      (!a.department_id || a.department_id === deptId) &&
      (!a.expires_at || new Date(a.expires_at) > new Date())
    )
  }

  if (!anns.length) return NextResponse.json({ announcements: [], unreadCount: 0 })

  const annIds = anns.map(a => a.id)

  // Get reads
  let reads: string[] = []
  if (userData?.employee_id) {
    const { data: rd } = await supa.from("announcement_reads")
      .select("announcement_id").eq("employee_id", userData.employee_id).in("announcement_id", annIds)
    reads = (rd ?? []).map((r: any) => r.announcement_id)
  }

  // Get reactions (counts + my reaction + reactor profiles)
  const { data: allReactions } = await supa.from("announcement_reactions")
    .select("announcement_id, employee_id, reaction_type, employee:employees!employee_id(first_name_th, last_name_th, nickname, avatar_url)")
    .in("announcement_id", annIds)

  const reactionMap: Record<string, { counts: Record<string, number>; total: number; my: string | null; reactors: Array<{ type: string; name: string; avatar_url: string | null }> }> = {}
  for (const id of annIds) reactionMap[id] = { counts: {}, total: 0, my: null, reactors: [] }

  for (const r of (allReactions ?? [])) {
    const m = reactionMap[r.announcement_id]
    if (!m) continue
    m.counts[r.reaction_type] = (m.counts[r.reaction_type] || 0) + 1
    m.total++
    if (r.employee_id === userData?.employee_id) m.my = r.reaction_type
    const emp = r.employee as any
    if (emp) {
      m.reactors.push({
        type: r.reaction_type,
        name: emp.nickname || `${emp.first_name_th} ${emp.last_name_th}`,
        avatar_url: emp.avatar_url,
      })
    }
  }

  const result = anns.map(a => ({
    ...a,
    is_read: reads.includes(a.id),
    reactions: reactionMap[a.id] || { counts: {}, total: 0, my: null, reactors: [] },
  }))

  return NextResponse.json({
    announcements: result,
    unreadCount: result.filter(a => !a.is_read).length,
  })
}

// POST — create/update/delete/react
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee_id").eq("id", user.id).single()

  const isAdmin = userData?.role === "super_admin" || userData?.role === "hr_admin"
  const body = await req.json()
  const { action } = body

  // ── Admin: create ──
  if (action === "create") {
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 })
    const { title, body: content, company_id, department_id, priority, is_pinned, expires_at, image_url } = body
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })

    const { data, error } = await supa.from("announcements").insert({
      title, body: content || null,
      company_id: company_id || null, department_id: department_id || null,
      priority: priority || "normal", is_pinned: is_pinned || false,
      expires_at: expires_at || null, image_url: image_url || null,
      created_by: userData?.employee_id,
    }).select("id").single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, id: data.id })
  }

  // ── Admin: update ──
  if (action === "update") {
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 })
    const { id, title, body: content, company_id, department_id, priority, is_pinned, expires_at, image_url } = body
    const { error } = await supa.from("announcements").update({
      title, body: content,
      company_id: company_id || null, department_id: department_id || null,
      priority: priority || "normal", is_pinned: is_pinned || false,
      expires_at: expires_at || null, image_url: image_url || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── Admin: delete ──
  if (action === "delete") {
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 })
    const { error } = await supa.from("announcements").delete().eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // ── User: mark read ──
  if (action === "mark_read") {
    if (!userData?.employee_id) return NextResponse.json({ error: "No employee" }, { status: 400 })
    await supa.from("announcement_reads").upsert({
      announcement_id: body.announcement_id,
      employee_id: userData.employee_id,
    }, { onConflict: "announcement_id,employee_id" })
    return NextResponse.json({ success: true })
  }

  // ── User: react (toggle) ──
  if (action === "react") {
    if (!userData?.employee_id) return NextResponse.json({ error: "No employee" }, { status: 400 })
    const { announcement_id, reaction_type } = body
    if (!REACTIONS.includes(reaction_type)) return NextResponse.json({ error: "Invalid reaction" }, { status: 400 })

    // Check existing
    const { data: existing } = await supa.from("announcement_reactions")
      .select("id, reaction_type")
      .eq("announcement_id", announcement_id)
      .eq("employee_id", userData.employee_id)
      .maybeSingle()

    if (existing) {
      if (existing.reaction_type === reaction_type) {
        // Same reaction → remove (toggle off)
        await supa.from("announcement_reactions").delete().eq("id", existing.id)
        return NextResponse.json({ success: true, action: "removed" })
      } else {
        // Different → update
        await supa.from("announcement_reactions")
          .update({ reaction_type }).eq("id", existing.id)
        return NextResponse.json({ success: true, action: "updated" })
      }
    } else {
      // New reaction
      await supa.from("announcement_reactions").insert({
        announcement_id, employee_id: userData.employee_id, reaction_type,
      })
      return NextResponse.json({ success: true, action: "added" })
    }
  }

  // ── Admin: upload image URL ──
  if (action === "upload_image") {
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 })
    const { announcement_id, image_url } = body
    if (announcement_id) {
      await supa.from("announcements").update({ image_url }).eq("id", announcement_id)
    }
    return NextResponse.json({ success: true, image_url })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
