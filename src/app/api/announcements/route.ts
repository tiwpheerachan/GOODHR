import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/auditLog"

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

  // Get comment counts
  const commentCountMap: Record<string, number> = {}
  const { data: commentCounts } = await supa.from("announcement_comments")
    .select("announcement_id").in("announcement_id", annIds)
  if (commentCounts) {
    for (const c of commentCounts) commentCountMap[c.announcement_id] = (commentCountMap[c.announcement_id] || 0) + 1
  }

  const result = anns.map(a => ({
    ...a,
    is_read: reads.includes(a.id),
    reactions: reactionMap[a.id] || { counts: {}, total: 0, my: null, reactors: [] },
    comment_count: commentCountMap[a.id] || 0,
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
    const { title, body: content, company_id, department_id, priority, is_pinned, expires_at, image_url, image_urls } = body
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })

    // Support both old image_url and new image_urls
    const finalImageUrls: string[] = image_urls && image_urls.length > 0
      ? image_urls
      : image_url ? [image_url] : []

    const { data, error } = await supa.from("announcements").insert({
      title, body: content || null,
      company_id: company_id || null, department_id: department_id || null,
      priority: priority || "normal", is_pinned: is_pinned || false,
      expires_at: expires_at || null,
      image_url: finalImageUrls[0] || null,
      image_urls: finalImageUrls,
      created_by: userData?.employee_id,
    }).select("id").single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: actorEmpAnnC } = userData?.employee_id
      ? await supa.from("employees").select("first_name_th, last_name_th").eq("id", userData.employee_id).single()
      : { data: null }
    const actorNameAnnC = actorEmpAnnC ? `${actorEmpAnnC.first_name_th} ${actorEmpAnnC.last_name_th}` : "Admin"
    logAudit(supa, {
      actorId: user.id, actorName: actorNameAnnC, action: "create_announcement",
      entityType: "announcement", entityId: data.id,
      description: `สร้างประกาศ "${title}" โดย ${actorNameAnnC}`,
    })
    return NextResponse.json({ success: true, id: data.id })
  }

  // ── Admin: update ──
  if (action === "update") {
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 })
    const { id, title, body: content, company_id, department_id, priority, is_pinned, expires_at, image_url, image_urls } = body

    const finalImageUrls: string[] = image_urls && image_urls.length > 0
      ? image_urls
      : image_url ? [image_url] : []

    const { error } = await supa.from("announcements").update({
      title, body: content,
      company_id: company_id || null, department_id: department_id || null,
      priority: priority || "normal", is_pinned: is_pinned || false,
      expires_at: expires_at || null,
      image_url: finalImageUrls[0] || null,
      image_urls: finalImageUrls,
      updated_at: new Date().toISOString(),
    }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: actorEmpAnnU } = userData?.employee_id
      ? await supa.from("employees").select("first_name_th, last_name_th").eq("id", userData.employee_id).single()
      : { data: null }
    const actorNameAnnU = actorEmpAnnU ? `${actorEmpAnnU.first_name_th} ${actorEmpAnnU.last_name_th}` : "Admin"
    logAudit(supa, {
      actorId: user.id, actorName: actorNameAnnU, action: "update_announcement",
      entityType: "announcement", entityId: id,
      description: `แก้ไขประกาศ "${title}" โดย ${actorNameAnnU}`,
    })
    return NextResponse.json({ success: true })
  }

  // ── Admin: delete ──
  if (action === "delete") {
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 })
    const { error } = await supa.from("announcements").delete().eq("id", body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data: actorEmpAnnD } = userData?.employee_id
      ? await supa.from("employees").select("first_name_th, last_name_th").eq("id", userData.employee_id).single()
      : { data: null }
    const actorNameAnnD = actorEmpAnnD ? `${actorEmpAnnD.first_name_th} ${actorEmpAnnD.last_name_th}` : "Admin"
    logAudit(supa, {
      actorId: user.id, actorName: actorNameAnnD, action: "delete_announcement",
      entityType: "announcement", entityId: body.id,
      description: `ลบประกาศ โดย ${actorNameAnnD}`,
    })
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

  // ── Comments: list ──
  if (action === "list_comments") {
    const { announcement_id } = body

    // Try with FK join first, fallback to manual join
    let { data: comments, error: commentsErr } = await supa.from("announcement_comments")
      .select("*, employee:employees!employee_id(first_name_th, last_name_th, nickname, avatar_url, employee_code)")
      .eq("announcement_id", announcement_id)
      .order("created_at", { ascending: true })
      .limit(100)

    if (commentsErr) {
      // FK not set up — manual join
      const { data: rawComments } = await supa.from("announcement_comments")
        .select("*")
        .eq("announcement_id", announcement_id)
        .order("created_at", { ascending: true })
        .limit(100)

      const empIds = Array.from(new Set((rawComments ?? []).map((c: any) => c.employee_id)))
      const { data: emps } = empIds.length > 0
        ? await supa.from("employees").select("id, first_name_th, last_name_th, nickname, avatar_url, employee_code").in("id", empIds)
        : { data: [] }
      const empMap: Record<string, any> = {}
      for (const e of (emps ?? [])) empMap[e.id] = e

      comments = (rawComments ?? []).map((c: any) => ({ ...c, employee: empMap[c.employee_id] || null }))
    }

    return NextResponse.json({ comments: comments ?? [] })
  }

  // ── Comments: add ──
  if (action === "add_comment") {
    if (!userData?.employee_id) return NextResponse.json({ error: "No employee" }, { status: 400 })
    const { announcement_id, body: commentBody, parent_id } = body
    if (!commentBody?.trim()) return NextResponse.json({ error: "Comment required" }, { status: 400 })

    // Insert comment
    const { data: rawComment, error } = await supa.from("announcement_comments").insert({
      announcement_id,
      employee_id: userData.employee_id,
      body: commentBody.trim(),
      parent_id: parent_id || null,
    }).select("*").single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get employee info separately (works regardless of FK)
    const { data: emp } = await supa.from("employees")
      .select("first_name_th, last_name_th, nickname, avatar_url")
      .eq("id", userData.employee_id).single()

    return NextResponse.json({ success: true, comment: { ...rawComment, employee: emp } })
  }

  // ── Comments: delete (own or admin) ──
  if (action === "delete_comment") {
    const { comment_id } = body
    if (isAdmin) {
      await supa.from("announcement_comments").delete().eq("id", comment_id)
    } else {
      await supa.from("announcement_comments").delete().eq("id", comment_id).eq("employee_id", userData?.employee_id)
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
